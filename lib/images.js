var fs = require('fs'),
    path = require('path'),
    _template = require('lodash.template');

var collect = require('./collect');

module.exports = function(options, files, cb) {
  return new Promise(function(resolve) {
    var tpl = _template(fs.readFileSync(path.join(__dirname, 'images.css')).toString());

    var src = collect(options, false, files, cb)[0];

    var out = [];

    for (var file in src.files) {
      out.push({
        src: file,
        dest: path.relative(options.cwd, src.files[file].dest),
      });
    }

    if (src.images['1x'].length) {
      out.push({
        dest: path.relative(options.cwd, path.join(options.dest, (options.images.name || 'images') + '.css')),
        data: tpl({
          selector: options.prefix,
          images: src.images['1x'].map(function(file) {
            return src.files[file];
          }),
          sizes: Object.keys(src.images).slice(1).map(function(size) {
            return {
              images: src.images[size].map(function(file) {
                return src.files[file];
              }),
              ratio: parseFloat(size)
            };
          })
        })
      });
    }

    resolve({
      data: src,
      files: out
    });
  });
};
