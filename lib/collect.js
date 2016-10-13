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
  var relative, dest, src;

  if (typeof file === 'object') {
    relative = path.relative(options.public, file.dest);
    dest = file.dest;
    src = file.src;
  } else {
    relative = path.relative(options.cwd, file);
    dest = path.join(options.dest, relative);
    src = file;
  }

  var name = path.basename(src);
  var data = imageSize(src);

  return {
    id: name.replace(/(@\dx)?\..+?$/, ''),
    dest: dest,
    path: relative,
    sizes: sizes(src),
    width: data.width,
    height: data.height
  };
}

module.exports = function(options, files) {
  var result = {
    bp: [],
    files: {},
    images: {
      '1x': []
    },
    vectors: []
  };

  files.forEach(function(file) {
    var src = typeof file === 'object' ? file.src : file;

    if (src.indexOf('.svg') > -1) {
      result.vectors.push(file);
    } else {
      result.files[src] = parse(options, file);
    }
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
