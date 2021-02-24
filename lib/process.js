const path = require('path');

const cwd = process.cwd();

function pre(opts, file) {
  for (let i = 0; i < opts.src.length; i += 1) {
    if (file.indexOf(`${opts.src[i]}/`) === 0) {
      file = path.relative(opts.src[i], file);
      break;
    }
  }
  return path.relative(opts.cwd, path.join(opts.dest, file));
}

function dest(opts, files) {
  if (opts.chdir) process.chdir(opts.cwd);
  return files.map(src => ({
    src: path.relative(opts.cwd, src),
    dest: pre(opts, path.relative(opts.cwd, src)),
  }));
}

function wrap(opts, deferred) {
  return deferred.then(result => {
    if (opts.chdir) process.chdir(cwd);
    if (result.data && result.data.vectors && result.data.vectors.length) {
      result.data.vectors.forEach(svg => {
        result.files.push(svg);
      });
    }
    return result.files;
  }).catch(e => {
    if (opts.chdir) process.chdir(cwd);
    throw e;
  });
}

module.exports = (options, handlers) => {
  const opts = {
    chdir: options.chdir,
    src: options.src || [],
    cwd: options.cwd || cwd,
    dest: path.resolve(options.cwd || cwd, options.dest || './generated'),
    public: path.resolve(options.cwd || cwd, options.public || './public'),
    prefix: options.prefix || 'icon',
    padding: options.padding,
    sizes: options.sizes,
    breakpoints: options.breakpoints,
    folders: options.folders || [],
    images: { ...options.images },
    sprites: { ...options.sprites },
  };

  return {
    images: files => wrap(opts, handlers.images(opts, dest(opts, files))),
    sprites: files => wrap(opts, handlers.sprites(opts, dest(opts, files))),
  };
};
