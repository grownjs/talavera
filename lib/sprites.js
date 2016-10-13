var fs = require('fs'),
    path = require('path'),
    SVGSpriter = require('svg-sprite'),
    Spritesmith = require('spritesmith'),
    _template = require('lodash.template'),
    Promise = require('es6-promise').Promise;

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

  var src = collect(options, files, cb);

  // TODO: in development mode inline everything as data:x
  //       this way the watching is faster because only need
  //       to regenerate the final stylesheet, plus caching of
  //       previous generated assets would be quick as hell...

  // TODO: in production mode try to inline everything < x KB

  // TODO: group by DEST?

  var tasks = [];

  if (src.vectors.length) {
    var spriter = new SVGSpriter({
      mode: {
        inline: true,
        symbol: true
      },
      shape: {
        id: {
          generator(_, vinyl) {
            return 'svg-' + path.basename(vinyl.path, '.svg');
          }
        }
      }
    });

    src.vectors.forEach(function(svg) {
      var id = path.relative(options.public, svg.dest);

      spriter.add(id, null, fs.readFileSync(svg.src).toString());
    });

    tasks.push(new Promise(function(resolve, reject) {
      spriter.compile(function(error, result) {
        if (error) {
          reject(error);
        } else {
          resolve({
            result: result
          });
        }
      });
    }));
  }

  Object.keys(src.images).forEach(function(key) {
    tasks.push(processImages({
      options: {
        padding: options.padding || 2,
        src: src.images[key]
      },
      size: key
    }));
  });

  return Promise.all(tasks)
    .then(function(results) {
      var dest = path.join(options.dest, options.sprites.name || 'sprites');

      var sizes = [];

      var out = [];

      results.forEach(function(data) {
        if (!data.params) {
          out.push({
            dest: dest + '.svg',
            data: data.result.symbol.sprite._contents.toString(),
          });
          return;
        }

        var ratio = parseInt(data.params.size, 10);

        sizes.push({
          images: Object.keys(data.result.coordinates).map(function(id) {
            var entry = src.files[id],
                image = data.result.coordinates[id];

            entry.x = image.x;
            entry.y = image.y;
            entry.dest = dest + '.css';

            return entry;
          }),
          image: {
            dest: dest + (ratio > 1 ? '@' + ratio + 'x' : '') + '.png',
            data: data.result.image,
            path: path.relative(options.public, dest) + '.png',
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

      sizes.forEach(function(size) {
        out.push({
          dest: size.image.dest,
          data: size.image.data
        });
      });

      out.push({
        dest: dest + '.css',
        data: tpl({
          breakpoints: src.bp.map(expand),
          selector: options.prefix || 'x',
          images: sizes[0].images,
          image: sizes[0].image,
          sizes: sizes.slice(1)
        })
      });

      return {
        data: src,
        files: out
      };
    });
};
