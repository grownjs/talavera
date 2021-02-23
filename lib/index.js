const path = require('path');

const images = require('./images');
const sprites = require('./sprites');
const inliner = require('./inline');
const _process = require('./process');

const _modules = {
  images,
  sprites,
};

const _preloader = path.join(__dirname, '../dist/preload.js');

module.exports = function talavera(_next) {
  if (typeof _next !== 'function') return _process(_next, _modules);

  const options = this.util.extend({}, this.opts.pluginOptions.talavera || {});

  const filter = this.filter;
  const cache = this.cache;
  const dist = this.dist;

  const cwd = this.opts.cwd;
  const read = this.util.read;
  const logger = this.logger;

  options.cache = cache.all() || {};
  options.prefix = options.prefix || 'x';
  options.folders = options.folders || [];

  options.sprites = ((typeof options.sprites === 'string' || Array.isArray(options.sprites)) && { filter: options.sprites })
    || ({ filter: '**/sprites/**/*.{png,svg}', ...options.sprites });

  options.images = ((typeof options.images === 'string' || Array.isArray(options.images)) && { filter: options.images })
    || ({ filter: '**/images/**/*.{gif,png,svg,jpg,jpeg}', ...options.images });

  options.cwd = cwd;
  options.dest = typeof options.dest === 'string' ? path.join(this.opts.output, options.dest) : this.opts.output;
  options.public = options.public ? path.join(cwd, options.public) : this.opts.output;

  function sync(id, data) {
    if (id && data) {
      const entry = cache.get(id);

      Object.keys(data).forEach(key => {
        entry[key] = data[key];
      });

      entry.dirty = false;
      return;
    }

    if (Array.isArray(id)) {
      id.forEach(file => {
        sync(file.src, file);
      });
      return;
    }

    if (id && typeof id === 'object') {
      Object.keys(id).forEach(x => {
        sync(x, id[x]);
      });
    }
  }

  function save(files) {
    files.forEach(file => {
      file.type = file.src ? 'copy' : 'write';
      file.quiet = file.type === 'copy';

      if (typeof options.rename === 'function') {
        options.rename(file);
      }

      dist(file);
    });
  }

  function hook(key) {
    filter(options[key].filter, (files, cb) => {
      return logger(`${key}:end`, options[key].filter, end => {
        return _modules[key](options, files).then(result => {
          if (key === 'images' && result.data.vectors.length) {
            result.data.vectors.forEach(svg => {
              result.files.push({
                src: svg.src,
                dest: svg.dest,
              });
            });
          }

          sync(result.data.vectors);
          sync(result.data.files);
          save(result.files);
          sync(files);

          cb(undefined, result.files.map(x => ({
            src: x.src,
            dest: x.dest,
          })));

          end(`${result.files.length} file${result.files.length === 1 ? '' : 's'} written`);
        });
      });
    });
  }

  function getAttrs(_) {
    const _attrs = [];

    Object.keys(_).forEach(prop => {
      if (prop !== 'src' && prop !== 'body') {
        if (typeof _[prop] !== 'undefined' && _[prop] !== null) {
          _attrs.push(` ${prop}="${_[prop]}"`);
        }
      }
    });

    return _attrs.join('');
  }

  function getIcon(_) {
    const id = _.src;
    const fixedId = id.replace('.svg', '').replace(/\//g, '-');
    const icon = `<i class="${options.prefix}-${fixedId}"${getAttrs(_)}>${_.alt || _.title || fixedId}</i>`;

    if (id.indexOf('.svg') !== -1) {
      const svg = cache.find(id) || {};

      if (svg.entry && svg.entry.href) {
        return `<object type="image/svg+xml" data="${svg.entry.href}"${getAttrs(_)}>${icon}</object>`;
      }
    }

    return icon;
  }

  const _inliner = inliner(cache, options);
  const _code = read(_preloader).toString();

  this.opts.bundleOptions.helpers.sprite = _ => {
    const { entry } = cache.find(_.src) || {};

    _.src = path.relative(options.dest, entry.dest);
    _.src = _.src.replace(/\.\w+$/, '');

    return getIcon(_);
  };

  this.opts.bundleOptions.helpers.image = _inliner;
  this.opts.bundleOptions.helpers.icon = getIcon;

  this.opts.bundleOptions.helpers.svgInline = _ => {
    const file = _.src.split('#')[0];
    const name = _.src.split('#')[1];

    let body = read(path.join(options.dest, file)).toString();

    if (name) {
      const matches = body.match(/<symbol[^<>]*>[\s\S]+?<\/symbol>/ig);

      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];

        if (new RegExp(`\\bid=["']?${name}["']?\\b`).test(match)) {
          const content = match.replace(/<symbol/i, '<svg').replace(/symbol>/, 'svg>');

          body = content;
          break;
        }
      }
    }

    return body.replace('<svg', `<svg${getAttrs(_)}`);
  };

  this.opts.bundleOptions.helpers.svgIcon = _ => {
    return `<svg${getAttrs(_)}><use xlink:href="#${options.prefix}-${_.src}"></use></svg>`;
  };

  this.opts.bundleOptions.resources.push(`<script>${_code.replace(/\s+/g, ' ')}</script>`);

  hook('images');
  hook('sprites');
  _next();
};

module.exports.preload = _preloader;
