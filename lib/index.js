var path = require('path');

var images = require('./images'),
    sprites = require('./sprites'),
    inliner = require('./inline');

var _modules = {
  images: images,
  sprites: sprites
};

var _preloader = path.join(__dirname, 'preload.js');

module.exports = function() {
  var options = this.util.extend({}, this.opts.pluginOptions.talavera || {});

  var filter = this.filter,
      cache = this.cache,
      dist = this.dist;

  var cwd = this.opts.cwd;
  var read = this.util.read;
  var logger = this.logger;

  options.cache = cache.all() || {};
  options.prefix = options.prefix || 'x';
  options.folders = options.folders || [];

  options.sprites = options.sprites || '**/sprites/**/*.{png,svg}';
  options.images = options.images || '**/images/**/*.{png,svg,jpg,jpeg}';

  options.cwd = cwd;
  options.dest = path.join(this.opts.output, options.dest || 'images');
  options.public = options.public ? path.join(cwd, options.public) : this.opts.output;

  function sync(id, data) {
    if (id && data) {
      var entry = cache.get(id);

      Object.keys(data).forEach(function(key) {
        entry[key] = data[key];
      });

      entry.dirty = false;
      return;
    }

    if (Array.isArray(id)) {
      id.forEach(function(file) {
        sync(file.src, file);
      });
      return;
    }

    for (var x in id) {
      sync(x, id[x]);
    }
  }

  function save(files) {
    files.forEach(function(file) {
      file.type = file.src ? 'copy' : 'write';
      file.quiet = file.type === 'copy';

      if (typeof options.rename === 'function') {
        options.rename(file);
      }

      dist(file);
    });
  }

  function hook(key) {
    if (Array.isArray(options[key]) || typeof options[key] === 'string') {
      options[key] = {
        filter: options[key]
      };
    }

    filter(options[key].filter, function(files, cb) {
      return logger(`${key}:end`, options[key].filter, function(end) {
        return _modules[key](options, files).then(function(result) {
          if (key === 'images' && result.data.vectors.length) {
            result.data.vectors.forEach(function(svg) {
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

          cb(undefined, result.files.map(function(x) {
            return {
              src: x.src,
              dest: x.dest,
            };
          }));

          end(`${result.files.length} file${result.files.length === 1 ? '' : 's'} written`);
        });
      });
    });
  }

  var _inliner = inliner(cache, options),
      _code = read(_preloader).toString();

  this.opts.bundleOptions.helpers.image = function(_) {
    return _inliner.apply(null, _.src);
  };

  this.opts.bundleOptions.helpers.icon = function(_) {
    var id = _.src[0];
    var fixedId = id.replace('.svg', '').replace(/\//g, '-');
    var icon = '<i class="' + options.prefix + '-' + fixedId + '"></i>';

    if (id.indexOf('.svg') !== -1) {
      var svg = cache.find(id) || {};

      if (svg.entry && svg.entry.href) {
        return '<object type="image/svg+xml" data="' + svg.entry.href + '">' + icon + '</object>';
      }
    }

    return icon;
  };

  function getAttrs(_) {
    var _attrs = [];

    Object.keys(_).forEach(function(prop) {
      if (prop !== 'src' && prop !== 'use') {
        if (typeof _[prop] !== 'undefined' && _[prop] !== null) {
          _attrs.push(' ' + prop + '="' + _[prop] + '"');
        }
      }
    });

    _.src.slice(1).forEach(function(attrs) {
      Object.keys(attrs).forEach(function(prop) {
        if (typeof attrs[prop] !== 'undefined' && attrs[prop] !== null) {
          _attrs.push(' ' + prop + '="' + attrs[prop] + '"');
        }
      });
    });

    return _attrs.join('');
  }

  this.opts.bundleOptions.helpers.svgi = function(_, self) {
    var file = _.src[0].split('#')[0];
    var name = _.src[0].split('#')[1];
    var body = read(path.join(self.dirname, file)).toString();

    if (name) {
      var matches = body.match(/<symbol[^<>]*>[\s\S]+?<\/symbol>/ig);

      for (var i = 0; i < matches.length; i += 1) {
        var match = matches[i];

        if (new RegExp('\\bid=["\']?' + name + '["\']?\\b').test(match)) {
          var content = match.replace(/<symbol/i, '<svg').replace(/symbol>/, 'svg>');

          body = content;
          break;
        }
      }
    }

    return body.replace('<svg', '<svg' + getAttrs(_));
  };

  this.opts.bundleOptions.helpers.svg = function(_) {
    return '<svg' + getAttrs(_) + '><use xlink:href="#' + options.prefix + '-' + (_.src[0]) + '"></use></svg>';
  };

  this.opts.bundleOptions.resources.push('<script>' + _code.replace(/\s+/g, ' ') + '</script>');

  hook('images');
  hook('sprites');
};
