const fs = require('fs');
const path = require('path');
const _template = require('lodash.template');

const collect = require('./collect');

module.exports = (options, files) => {
  return new Promise(resolve => {
    const tpl = _template(fs.readFileSync(path.join(__dirname, 'images.css')).toString());
    const src = collect(options, false, files)[0];
    const out = [];

    Object.keys(src.files).forEach(file => {
      out.push({
        src: file,
        dest: path.relative(options.cwd, src.files[file].dest),
      });
    });

    if (src.images['1x'].length) {
      out.push({
        dest: path.relative(options.cwd, path.join(options.dest, `${options.images.name || 'images'}/index.css`)),
        data: tpl({
          selector: options.prefix,
          images: src.images['1x'].map(file => {
            return src.files[file];
          }),
          sizes: Object.keys(src.images).slice(1).map(size => {
            return {
              images: src.images[size].map(file => {
                return src.files[file];
              }),
              ratio: parseFloat(size),
            };
          }),
        }),
      });
    }

    resolve({
      data: src,
      files: out,
    });
  });
};
