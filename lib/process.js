const path = require('path');
const fs = require('fs');

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
  return files.filter(fs.existsSync).map(src => ({
    src: path.relative(opts.cwd, src),
    dest: pre(opts, path.relative(opts.cwd, src)),
  }));
}

function wrap(opts, deferred) {
  return deferred.then(result => {
    if (opts.chdir) process.chdir(cwd);
    if (result.data) {
      if (result.data.vectors && result.data.vectors.length) {
        result.data.vectors.forEach(svg => {
          result.files.push(svg);
        });
      }
      if (result.data.files) {
        result.files = result.files.map(x => ({ ...result.data.files[x.src], ...x }));
      }
    }
    return result.files;
  }).catch(e => {
    if (opts.chdir) process.chdir(cwd);
    throw e;
  });
}

module.exports = (options, handlers) => {
  const opts = {
    rename: options.rename,
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

  function svgInline(id, ref, props, ctx) {
    if (!id) {
      return `<svg${ctx.attributes(props, ['src', 'inline'])}><use xlink:href="#${opts.prefix}-${ref}"></use></svg>`;
    }

    const svgFile = fs.readFileSync(path.join(opts.dest, id)).toString();
    const matches = svgFile.match(/<symbol[^<>]*>[\s\S]+?<\/symbol>/ig);
    const regexp = new RegExp(`\\bid=["']?${opts.prefix}-${ref}["']?\\b`);

    let found;
    if (matches) {
      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];

        if (regexp.test(match)) {
          found = match.replace(/<symbol/i, '<svg').replace(/symbol>/, 'svg>');
          break;
        }
      }
    }

    if (!found) {
      throw new Error(`Unable to locate '${id}#${ref}'`);
    }
    return found.replace('<svg', `<svg${ctx.attributes(props, ['src', 'inline'])}`);
  }

  function getImage(props, ctx) {
    const res = ctx.locate(props.src);
    const attrs = ctx.attributes(props, ['src']);

    if (!(res.entry && res.entry.sizes)) {
      return `<img src="${res.dest}"${attrs}>`;
    }

    const keys = Object.keys(res.entry.sizes);

    let srcSet = '';
    if (keys.length) {
      srcSet += ` srcset="${keys.map(size => {
        return `${ctx.locate(res.entry.sizes[size]).dest} ${size}`;
      }).join(', ')}"`;
    }

    let placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    if (res.entry.filesize < ((opts.limit || 4) * 1000)) {
      const body = fs.readFileSync(res.entry.filepath).toString('base64');
      const type = path.extname(res.entry.filepath).substr(1);

      placeholder = `data:image/${type};base64,${body}`;
    }

    return [
      '<img src="', placeholder, '"',
      ' height="', res.entry.height, '"',
      ' width="', res.entry.width, '"',
      ' data-inline-ignore',
      srcSet,
      attrs,
      '>',
    ].join('');
  }

  function getIcon(props, ctx) {
    const [id, ref] = props.src.split('#');
    const fixedId = id.replace('.svg', '').replace(/\//g, '-');
    const icon = `<i class="${opts.prefix}-${fixedId}"${ctx.attributes(props, ['src', 'inline'])}>${props.alt || props.title || fixedId}</i>`;

    if (!id && ref) {
      return svgInline(null, ref, props, ctx);
    }

    if (id.indexOf('.svg') !== -1) {
      const chunk = ctx.locate(id);

      if (ref) {
        return svgInline(props.inline ? chunk.dest : null, ref, props, ctx);
      }

      if (chunk.dest) return `<object type="image/svg+xml" data="${chunk.dest}"${ctx.attributes(props, ['src', 'inline'])}>${icon}</object>`;
      if (chunk.path) return fs.radFileSync(chunk.path).toString();

      throw new Error(`Unable to embed '${props.src}'`);
    }
    return icon;
  }

  return {
    hooks: {
      image: ({ props }, ctx) => getImage(props, ctx),
      icon: ({ props }, ctx) => getIcon(props, ctx),
    },
    images: files => wrap(opts, handlers.images(opts, dest(opts, files))),
    sprites: files => wrap(opts, handlers.sprites(opts, dest(opts, files))),
  };
};
