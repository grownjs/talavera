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

  options.cache = cache.all() || {};
  options.prefix = options.prefix || 'x';

  options.sprites = options.sprites || '**/sprites/**/*.{png,svg}';
  options.images = options.images || '**/images/**/*.{png,jpg,jpeg}';

  options.cwd = cwd;
  options.dest = path.join(this.opts.dest, options.dest || 'images');
  options.public = options.public ? path.join(cwd, options.public) : this.opts.dest;

  function save(result) {
    result.files.forEach(function(file) {
      file.type = file.src ? 'copy' : 'write';
      dist(file);
    });
  }

  function sync(id, data) {
    if (id && data) {
      var entry = cache.get(id);

      Object.keys(data).forEach(function(key) {
        entry[key] = data[key];
      });

      delete entry.dirty;
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

  function hook(key) {
    if (Array.isArray(options[key]) || typeof options[key] === 'string') {
      options[key] = {
        filter: options[key]
      };
    }

    filter(options[key].filter, function(files, cb) {
      _modules[key](options, files)
        .then(function(result) {
          sync(result.data.vectors);
          sync(result.data.files);
          save(result);

          cb(undefined, result.files);
        });
    });
  }

  var _inliner = inliner(cache, options),
      _code = read(_preloader).toString();

  this.opts.bundleOptions.helpers.image = function() {
    return _inliner.apply(null, arguments);
  };

  this.opts.bundleOptions.helpers.svg = function(id) {
    var _attrs = [];

    Array.prototype.slice.call(arguments, 1).forEach(function(attrs) {
      Object.keys(attrs).forEach(function(prop) {
        if (typeof attrs[prop] !== 'undefined' && attrs[prop] !== null) {
          _attrs.push(' ' + prop + '="' + attrs[prop] + '"');
        }
      });
    });

    return '<svg' + _attrs.join('') + '><use xlink:href="#' + options.prefix + '-' + id + '"></use></svg>';
  };

  this.opts.bundleOptions.resources.push('<script>' + _code.replace(/\s+/g, ' ') + '</script>');

  hook('images');
  hook('sprites');
};
