const debug = require('debug')('talavera:collect');

const fs = require('fs');
const path = require('path');
const imageSize = require('fast-image-size');

function sizes(file) {
  const name = path.basename(file);
  const out = {};

  if (name.indexOf('@') > -1) {
    out[`${parseInt(name.split('@')[1], 10)}x`] = file;
  } else {
    out['1x'] = file;
  }

  return out;
}

function parse(options, file) {
  const relative = path.relative(options.dest, path.join(options.cwd, file.dest));
  const absolute = path.relative(options.public, path.join(options.cwd, file.dest)).replace(/\.{1,2}\//g, '');

  const unprefixed = relative.split('/')
    .filter(x => options.folders.indexOf(x) === -1)
    .join('/');

  const _root = path.dirname(file.src) || null;
  const name = path.basename(file.src);
  const data = imageSize(file.src);
  const dest = file.dest;
  const src = file.src;

  debug('parse %s', src);

  return {
    id: name.replace(/(@\dx)?\..+?$/, ''),
    src,
    dest,
    root: _root,
    path: relative,
    href: absolute,
    base: unprefixed,
    sizes: sizes(src),
    width: data.width,
    height: data.height,
    filesize: fs.statSync(src).size,
  };
}

function suffix(value, nth) {
  return value.replace(/(\.\w+?)$/, `@${nth}x$1`);
}

module.exports = (options, groups, files) => {
  const grouped = {};
  const data = [];

  function add(result) {
    Object.keys(result.files).some(file => {
      if (file.indexOf('@') > -1) return true;

      (options.sizes || [2, 3]).forEach(nth => {
        let x = suffix(file, nth);
        const y = suffix(result.files[file].base, nth);

        if (!result.files[x] && grouped[y]) {
          x = grouped[y];
        }

        if (result.files[x]) {
          if (!result.images[`${nth}x`]) {
            result.images[`${nth}x`] = [];
          }

          result.images[`${nth}x`].push(x);
          result.files[x].sizes['1x'] = file;
          result.files[file].sizes[`${nth}x`] = x;
        }
      });

      result.images['1x'].push(file);
      return false;
    });

    const bpOpts = options.breakpoints || {};

    if (bpOpts.steps) {
      bpOpts.steps.reverse().forEach(step => {
        const fixedImages = [];

        result.images['1x'].forEach(file => {
          const image = result.files[file];

          if (image.width > bpOpts.minWidth) {
            fixedImages.push(file);
          }
        });

        result.bp.push({
          width: step.max,
          ratio: step.ratio,
          images: fixedImages,
        });
      });
    }

    data.push(result);
  }

  function push(file, result) {
    const src = typeof file === 'object' ? file.src : file;

    if (fs.existsSync(src)) {
      const parsed = parse(options, file);

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
        '1x': [],
      },
      vectors: [],
      dirname: prefix || '',
    };
  }

  function append(list, prefix) {
    const result = group(prefix);

    debug('group %s', prefix || 'default');

    list.forEach(file => {
      push(file, result);
    });

    add(result);
  }

  if (groups && files.length) {
    let first = files
      .map(file => file.dest.split('/'))
      .sort((a, b) => a.length - b.length)[0];

    const single = [];
    const _group = {};

    first.pop();
    first = first.join('/');

    const basename = path.basename(first);
    const prefix = options.folders.indexOf(basename)
      ? path.dirname(first)
      : first;

    files.forEach(file => {
      const relative = prefix === '.'
        ? file.dest.substr(first.length + 1)
        : file.dest.substr(prefix.length + 1);

      const dirname = path.dirname(relative);

      if (dirname === '.' || options.folders.indexOf(dirname) !== -1) {
        single.push(file);
      } else {
        if (!_group[dirname]) {
          _group[dirname] = [];
        }

        _group[dirname].push(file);
      }
    });

    Object.keys(_group).forEach(key => {
      append(_group[key], key);
    });

    files = single;
  }

  append(files);

  return data;
};
