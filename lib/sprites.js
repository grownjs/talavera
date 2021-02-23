const fs = require('fs');
const path = require('path');
const SVGSpriter = require('svg-sprite');
const Spritesmith = require('spritesmith');
const _template = require('lodash.template');

const collect = require('./collect');
const defaults = require('./defaults');

function processImages(params) {
  return new Promise((resolve, reject) => {
    Spritesmith.run(params.options, (err, result) => {
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

module.exports = (options, files) => {
  const tpl = _template(fs.readFileSync(path.join(__dirname, 'sprites.css')).toString());

  options.breakpoints = options.breakpoints || defaults.breakpoints;

  const groups = collect(options, true, files);

  const sources = [];
  const output = [];

  function dest(prefix) {
    return path.join(options.dest, prefix || options.sprites.name || 'sprites');
  }

  return Promise.all(groups.map(src => {
    const tasks = [];

    if (src.vectors.length) {
      const spriter = new SVGSpriter({
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


      src.vectors.forEach(svg => {
        if (fs.existsSync(svg.src)) {
          spriter.add(svg.src, null, fs.readFileSync(svg.src).toString());
        }
      });

      tasks.push(new Promise((resolve, reject) => {
        spriter.compile((error, result) => {
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

    Object.keys(src.images).forEach(key => {
      if (!src.images[key].length) {
        return;
      }

      tasks.push(processImages({
        options: {
          padding: options.padding || 2,
          src: src.images[key],
          algorithm: 'top-down'
        },
        size: key
      }));
    });

    const dir = src.dirname ? `-${src.dirname.replace(/\//g, '-')}` : '';

    return Promise.all(tasks)
      .then(results => {
        const sizes = [];
        const out = [];

        results.forEach(data => {
          if (data.vectors) {
            out.push({
              dest: path.relative(options.cwd, `${dest(src.dirname !== '/' ? src.dirname : 'sprites')}.svg`),
              data: data.result.symbol.sprite._contents.toString()
                .replace(/<!DOCTYPE[^<>]*>/i, '')
            });
            return;
          }

          const ratio = parseFloat(data.params.size);
          const suffix = ratio > 1 ? `@${ratio}x` : '';

          sizes.push({
            images: Object.keys(data.result.coordinates).map(id => {
              const entry = src.files[id];
              const image = data.result.coordinates[id];

              entry.x = image.x;
              entry.y = image.y;
              entry.dest = path.relative(options.cwd, `${dest(src.dirname)}.css`);

              return entry;
            }),
            image: {
              dest: path.relative(options.cwd, `${dest(src.dirname)}${suffix}.png`),
              path: `${path.basename(dest(src.dirname))}${suffix}.png`,
              data: data.result.image,
              width: data.result.properties.width,
              height: data.result.properties.height
            },
            ratio: ratio
          });
        });

        function expand(obj) {
          obj.images = obj.images.map(id => {
            return src.files[id];
          });

          return obj;
        }

        if (sizes.length) {
          sizes.forEach(size => {
            out.push({
              dest: path.relative(options.cwd, size.image.dest),
              data: size.image.data
            });
          });

          out.push({
            dest: path.relative(options.cwd, `${dest(src.dirname)}.css`),
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
  .then(() => ({
    data: sources,
    files: output
  }));
};
