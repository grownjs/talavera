var debug = require('debug')('talavera:collect');

var fs = require('fs'),
    path = require('path'),
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
  var relative = path.relative(options.dest, path.join(options.cwd, file.dest));
  var absolute = path.relative(options.public, path.join(options.cwd, file.dest));

  var unprefixed = relative.split('/')
    .filter(function(x) {
      return options.folders.indexOf(x) === -1;
    })
    .join('/');

  var dest = file.dest;
  var src = file.src;

  var name = path.basename(src);
  var data = imageSize(src);

  debug('parse %s', src);

  return {
    id: name.replace(/(@\dx)?\..+?$/, ''),
    src: src,
    dest: dest,
    path: relative,
    href: absolute,
    base: unprefixed,
    sizes: sizes(src),
    width: data.width,
    height: data.height,
    filesize: fs.statSync(src).size
  };
}

function suffix(value, nth) {
  return value.replace(/(\.\w+?)$/, '@' + nth + 'x$1');
}

module.exports = function(options, groups, files) {
  var grouped = {};
  var data = [];

  function add(result) {
    for (var file in result.files) {
      if (file.indexOf('@') > -1) {
        continue;
      }

      (options.sizes || [2, 3]).forEach(function(nth) {
        var x = suffix(file, nth);
        var y = suffix(result.files[file].base, nth);

        if (!result.files[x] && grouped[y]) {
          x = grouped[y];
        }

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

    data.push(result);
  }

  function push(file, result) {
    var src = typeof file === 'object' ? file.src : file;

    if (fs.existsSync(src)) {
      var parsed = parse(options, file);

      if (src.indexOf('.svg') > -1) {
        result.vectors.push(parsed);
      } else {
        result.files[src] = parsed;
        grouped[parsed.base] = src;
      }
    }
  }

  function group(prefix) {
    return {
      bp: [],
      files: {},
      images: {
        '1x': []
      },
      vectors: [],
      dirname: prefix || ''
    };
  }

  function append(files, prefix) {
    var result = group(prefix);

    debug('group %s', prefix || 'default');

    files.forEach(function(file) {
      push(file, result);
    });

    add(result);
  }

  if (groups) {
    var first = files
      .map(function(file) {
        return file.dest.split('/');
      })
      .sort(function(a, b) {
        return a.length - b.length;
      })[0];

    var single = [];
    var _group = {};

    first.pop();
    first = first.join('/');

    var basename = path.basename(first);
    var prefix = options.folders.indexOf(basename)
      ? path.dirname(first)
      : first;

    files.forEach(function(file) {
      var relative = file.dest.substr(prefix.length + 1);
      var dirname = path.dirname(relative);

      if (dirname === '.' || options.folders.indexOf(dirname) !== -1) {
        single.push(file);
      } else {
        if (!_group[dirname]) {
          _group[dirname] = [];
        }

        _group[dirname].push(file);
      }
    });

    Object.keys(_group).forEach(function(key) {
      append(_group[key], key);
    });

    files = single;
  }

  append(files);

  return data;
};
