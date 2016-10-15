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
  var options = this.opts.pluginOptions.talavera || {};

  var filter = this.filter,
      cache = this.cache,
      dist = this.dist;

  var cwd = this.opts.cwd;

  var read = this.util.read,
      mtime = this.util.mtime;

  options.prefix = options.prefix || 'x';

  options.dest = path.join(this.opts.dest, options.dest || '');
  options.public = path.join(this.opts.public, options.public || '');

  options.sprites = options.sprites || '**/sprites/**/*.{png,svg}';
  options.images = options.images || '**/images/**/*.{png,jpg,jpeg}';

  function collect(src) {
    var seen = {},
        out = [];

    src.forEach(function(file) {
      var entry = cache.get(file.src);

      out.push(file);

      seen[file.src] = 1;

      if (!entry.dirty) {
        return;
      }

      if (!seen[file.dest] && entry.id) {
        seen[file.dest] = 1;

        cache.each(function(dep, id) {
          if (!seen[id] && dep.id) {
            if (dep.dest === file.dest) {
              out.push(id);
              seen[id] = 1;
            }
          }
        });
      }
    });

    return out;
  }

  function save(result) {
    result.files.forEach(function(file) {
      var target = {
        type: file.src ? 'copy' : 'write',
        dest: path.relative(cwd, file.dest)
      };

      if (file.src) {
        target.src = path.relative(cwd, file.src);
      }

      if (file.data) {
        target.data = file.data;
      }

      dist(target);
    });
  }

  function sync(files) {
    for (var file in files) {
      var entry = {};

      for (var k in files[file]) {
        entry[k] = files[file][k];
      }

      entry.mtime = mtime(file);

      Object.keys(entry.sizes).forEach(function(size) {
        entry.sizes[size] = entry.sizes[size];
      });

      cache.set(file, entry);
    }
  }

  function hook(key) {
    if (Array.isArray(options[key]) || typeof options[key] === 'string') {
      options[key] = {
        filter: options[key]
      };
    }

    filter(options[key].filter, function(files, cb) {
      _modules[key](options, collect(files))
        .then(function(result) {
          sync(result.data.files);
          save(result);

          cb(undefined, result.files);
        });
    });
  }

  var _inliner = inliner(cache),
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
