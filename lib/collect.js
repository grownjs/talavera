var path = require('path'),
    imageSize = require('fast-image-size');

function parse(options, file) {
  var relative = path.relative(options.cwd, file);

  var dest = path.join(options.dest, relative);

  var name = path.basename(file);

  var out = {
    id: name.replace(/(@\dx)?\..+?$/, ''),
    dest: dest,
    path: {
      relative: relative,
      absolute: path.relative(options.public, dest)
    }
  };

  out.sizes = {};

  if (name.indexOf('@') > -1) {
    out.sizes[parseInt(name.split('@')[1], 10) + 'x'] = file;
  } else {
    out.sizes['1x'] = file;
  }

  if (options.breakpoints) {
    var data = imageSize(file);

    out.width = data.width;
    out.height = data.height;
  }

  return out;
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
          fixedImages.push(file);
        }
      });

      result.bp.push({
        width: step.max,
        ratio: step.ratio,
        images: fixedImages
      });
    });
  }

  return result;
};