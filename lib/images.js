var fs = require('fs'),
    path = require('path'),
    _template = require('lodash.template');

var helper = require('./helper'),
    collect = require('./collect');

module.exports = function(options, files, cb) {
  return new Promise(function(resolve) {
    var tpl = _template(fs.readFileSync(path.join(__dirname, 'images.css')).toString());

    var src = collect(options, files, cb);

    resolve({
      load: helper(src),
      data: src,
      code: tpl({
        selector: options.prefix || 'x',
        images: src.images['1x'].map(function(file) {
          return src.files[file];
        }),
        sizes: Object.keys(src.images).slice(1).map(function(size) {
          return {
            images: src.images[size].map(function(file) {
              return src.files[file];
            }),
            ratio: parseInt(size, 10)
          };
        })
      })
    });
  });
};
