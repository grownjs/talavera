var path = require('path'),
    imageSize = require('fast-image-size');

function parse(options, file) {
  var relative = path.relative(options.cwd, file);

  var dest = path.join(options.dest, relative);

  var data = imageSize(file),
      name = path.basename(file);

  var sizes = {};

  if (name.indexOf('@') > -1) {
    sizes[parseInt(name.split('@')[1], 10) + 'x'] = file;
  } else {
    sizes['1x'] = file;
  }

  return {
    id: name.replace(/(@\dx)?\..+?$/, ''),
    dest: dest,
    path: {
      relative: relative,
      absolute: path.relative(options.public, dest)
    },
    sizes: sizes,
    width: data.width,
    height: data.height
  };
}

module.exports = function(options, files, cb) {
  var result = {
    bp: [],
    map: {},
    files: {},
    images: {
      '1x': []
    }
  };

  files.forEach(function(src) {
    result.files[src] = parse(options, src);

    if (cb) {
      cb(src, result.files);
    }
  });

  var sizes = options.sizes || [2, 3];

  for (var file in result.files) {
    if (file.indexOf('@') > -1) {
      continue;
    }

    sizes.forEach(function(nth) {
      var x = file.replace(/(\.\w+?)$/, '@' + nth + 'x$1');

      if (result.files[x]) {
        if (!result.images[nth + 'x']) {
          result.images[nth + 'x'] = [];
        }

        result.images[nth + 'x'].push(x);
        result.files[x].sizes['1x'] = file;
        result.files[file].sizes[nth + 'x'] = x;
      }
    });

    result.images['1x'].push(file);

    result.map[path.relative(options.cwd, file).replace(/\..+?$/, '')] = file;
  }

  var bpOpts = options.breakpoints || {};

  if (bpOpts.steps) {
    bpOpts.steps.reverse().forEach(function(step) {
      var fixedImages = [];

      result.images['1x'].forEach(function(file) {
        var image = result.files[file];

        if (image.width > bpOpts.minWidth) {
          fixedImages.push({
            id: image.id,
            width: image.width / step.ratio,
            height: image.height / step.ratio
          });
        }
      });

      result.bp.push({
        width: step.max,
        images: fixedImages
      });
    });
  }

  return result;
};
