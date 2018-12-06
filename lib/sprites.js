var fs = require('fs'),
    path = require('path'),
    SVGSpriter = require('svg-sprite'),
    Spritesmith = require('spritesmith'),
    _template = require('lodash.template');

var _cached = {};

var collect = require('./collect'),
    defaults = require('./defaults');

function processImages(params) {
  return new Promise(function(resolve, reject) {
    Spritesmith.run(params.options, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve({
          params: params,
          result: result
        });
      }
    });
  });
}

module.exports = function(options, files, cb) {
  var tpl = _template(fs.readFileSync(path.join(__dirname, 'sprites.css')).toString());

  options.breakpoints = options.breakpoints || defaults.breakpoints;

  var groups = collect(options, true, files, cb);

  // TODO: in development mode inline everything as data:x
  //       this way the watching is faster because only need
  //       to regenerate the final stylesheet, plus caching of
  //       previous generated assets would be quick as hell...

  // TODO: in production mode try to inline everything < x KB

  var sources = [];
  var output = [];

  function dest(prefix) {
    return path.join(options.dest, prefix || options.sprites.name || 'sprites');
  }

  return Promise.all(groups.map(function(src) {
    var tasks = [];

    if (src.vectors.length) {
      var spriter = new SVGSpriter({
        svg: {
          xmlDeclaration: false,
          rootAttributes: {
            width: 0,
            height: 0,
            style: 'position:absolute'
          }
        },
        mode: {
          symbol: true,
        },
        shape: {
          id: {
            generator(_, vinyl) {
              return options.prefix + '-' + path.basename(vinyl.path, '.svg');
            }
          }
        }
      });

      src.vectors.forEach(function(svg) {
        var entry = options.cache[svg.src];

        if (!entry.deleted) {
          if (!_cached[svg.src] || entry.dirty) {
            _cached[svg.src] = fs.readFileSync(svg.src).toString();
          }

          spriter.add(svg.id, null, _cached[svg.src]);
        }
      });

      tasks.push(new Promise(function(resolve, reject) {
        spriter.compile(function(error, result) {
          if (error) {
            reject(error);
          } else {
            resolve({
              result: result,
              vectors: true
            });
          }
        });
      }));
    }

    Object.keys(src.images).forEach(function(key) {
      if (!src.images[key].length) {
        return;
      }

      tasks.push(processImages({
        options: {
          padding: options.padding || 2,
          src: src.images[key]
        },
        size: key
      }));
    });

    var dir = src.dirname ? '-' + src.dirname.replace(/\//g, '-') : '';

    return Promise.all(tasks)
      .then(function(results) {
        var sizes = [];
        var out = [];

        results.forEach(function(data) {
          if (data.vectors) {
            out.push({
              dest: path.relative(options.cwd, dest(src.dirname !== '/' ? src.dirname : 'sprites') + '.svg'),
              data: data.result.symbol.sprite._contents.toString()
                .replace(/<!DOCTYPE[^<>]*>/i, '')
            });
            return;
          }

          var ratio = parseFloat(data.params.size);
          var suffix = ratio > 1 ? '@' + ratio + 'x' : '';

          sizes.push({
            images: Object.keys(data.result.coordinates).map(function(id) {
              var entry = src.files[id],
                  image = data.result.coordinates[id];

              entry.x = image.x;
              entry.y = image.y;
              entry.dest = path.relative(options.cwd, dest(src.dirname) + '.css');

              return entry;
            }),
            image: {
              dest: path.relative(options.cwd, dest(src.dirname) + suffix + '.png'),
              path: path.relative(options.dest, dest(src.dirname)) + suffix + '.png',
              data: data.result.image,
              width: data.result.properties.width,
              height: data.result.properties.height
            },
            ratio: ratio
          });
        });

        function expand(obj) {
          obj.images = obj.images.map(function(id) {
            return src.files[id];
          });

          return obj;
        }

        if (sizes.length) {
          sizes.forEach(function(size) {
            out.push({
              dest: path.relative(options.cwd, size.image.dest),
              data: size.image.data
            });
          });

          out.push({
            dest: path.relative(options.cwd, dest(src.dirname) + '.css'),
            data: tpl({
              breakpoints: src.bp.map(expand),
              selector: options.prefix + dir,
              images: sizes[0].images,
              image: sizes[0].image,
              sizes: sizes.slice(1),
            })
          });
        }

        Array.prototype.push.apply(sources, src);
        Array.prototype.push.apply(output, out);
      });
  }))
  .then(function() {
    return {
      data: sources,
      files: output
    };
  });
};
