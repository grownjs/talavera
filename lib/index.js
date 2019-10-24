const path = require('path');

const images = require('./images');
const sprites = require('./sprites');
const inliner = require('./inline');

const _modules = {
  images: images,
  sprites: sprites
};

const _preloader = path.join(__dirname, 'preload.js');

module.exports = function () {
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
    || Object.assign({ filter: '**/sprites/**/*.{png,svg}' }, options.sprites);

  options.images = ((typeof options.images === 'string' || Array.isArray(options.images)) && { filter: options.images })
    || Object.assign({ filter: '**/images/**/*.{gif,png,svg,jpg,jpeg}' }, options.images);

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

    for (var x in id) {
      sync(x, id[x]);
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
        return _modules[process.env.NODE_ENV !== 'production' ? 'images' : key](options, files).then(result => {
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

  function getIcon(_) {
    const id = _.src[0];
    const fixedId = id.replace('.svg', '').replace(/\//g, '-');
    const icon = `<i class="${options.prefix}-${fixedId}">${_.alt || fixedId}</i>`;

    if (id.indexOf('.svg') !== -1) {
      const svg = cache.find(id) || {};

      if (svg.entry && svg.entry.href) {
        return `<object type="image/svg+xml" data="${svg.entry.href}">${icon}</object>`;
      }
    }

    return icon;
  }

  function getAttrs(_) {
    const _attrs = [];

    Object.keys(_).forEach(prop => {
      if (prop !== 'src' && prop !== 'use') {
        if (typeof _[prop] !== 'undefined' && _[prop] !== null) {
          _attrs.push(' ' + prop + '="' + _[prop] + '"');
        }
      }
    });

    _.src.slice(1).forEach(attrs => {
      Object.keys(attrs).forEach(prop => {
        if (typeof attrs[prop] !== 'undefined' && attrs[prop] !== null) {
          _attrs.push(' ' + prop + '="' + attrs[prop] + '"');
        }
      });
    });

    return _attrs.join('');
  }

  const _inliner = inliner(cache, options);
  const _code = read(_preloader).toString();

  this.opts.bundleOptions.helpers.sprite = _ => {
    if (!Array.isArray(_.src) || _.src.length === 1) {
      const parts = _.src.toString().split('-');
      const name = parts.pop();

      _.src = [parts.join('-'), name];
    }

    if (process.env.NODE_ENV !== 'production') {
      return `<i class="${options.prefix}-${_.src[1]}">${_.alt || _.src[1]}</i>`;
    }

    _.src = [_.src.join('-')];

    return getIcon(_);
  };

  this.opts.bundleOptions.helpers.image = _ => _inliner.apply(null, _.src);
  this.opts.bundleOptions.helpers.icon = getIcon;

  this.opts.bundleOptions.helpers.svgi = _ => {
    const file = _.src[0].split('#')[0];
    const name = _.src[0].split('#')[1];
    const body = read(path.join(options.dest, file)).toString();

    if (name) {
      const matches = body.match(/<symbol[^<>]*>[\s\S]+?<\/symbol>/ig);

      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];

        if (new RegExp('\\bid=["\']?' + name + '["\']?\\b').test(match)) {
          const content = match.replace(/<symbol/i, '<svg').replace(/symbol>/, 'svg>');

          body = content;
          break;
        }
      }
    }

    return body.replace('<svg', `<svg${getAttrs(_)}`);
  };

  this.opts.bundleOptions.helpers.svg = _ => {
    return `<svg${getAttrs(_)}><use xlink:href="#${options.prefix}-${_.src[0]}"></use></svg>`;
  };

  this.opts.bundleOptions.resources.push(`<script>${_code.replace(/\s+/g, ' ')}</script>`);

  hook('images');
  hook('sprites');
};
