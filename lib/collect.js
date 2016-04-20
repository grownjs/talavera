var path = require('path'),
    imageSize = require('fast-image-size');

function sizes(file) {
  var name = path.basename(file);

  var out = {};

  if (name.indexOf('@') > -1) {
    out[parseInt(name.split('@')[1], 10) + 'x'] = file;
  } else {
    out['1x'] = file;
  }

  return out;
}

function parse(options, file) {
  var relative = path.relative(options.cwd, file);
  var dest = path.join(options.dest, relative);
  var name = path.basename(file);
  var data = imageSize(file);

  return {
    id: name.replace(/(@\dx)?\..+?$/, ''),
    dest: dest,
    path: {
      relative: relative,
      absolute: path.relative(options.public, dest)
    },
    sizes: sizes(file),
    width: data.width,
    height: data.height
  };
}

module.exports = function(options, files) {
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
  });

  for (var file in result.files) {
    if (file.indexOf('@') > -1) {
      continue;
    }

    (options.sizes || [2, 3]).forEach(function(nth) {
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
