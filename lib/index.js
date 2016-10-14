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
  var options = this.opts.pluginOptions.images || {};

  var filter = this.filter,
      cache = this.cache,
      dist = this.dist;

  var cwd = this.opts.cwd;

  var mtime = this.util.mtime;

  options.prefix = options.prefix || 'x';

  // override later
  options.cwd = path.join(cwd, options.cwd || '');
  options.dest = options.dest ? path.join(cwd, options.dest) : this.opts.dest;
  options.public = options.public ? path.join(cwd, options.public) : this.opts.public;

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
        entry[path.relative(cwd, k)] = files[file][k];
      }

      entry.mtime = mtime(file);
      entry.dest = path.relative(cwd, entry.dest);

      Object.keys(entry.sizes).forEach(function(size) {
        entry.sizes[size] = path.relative(cwd, entry.sizes[size]);
      });

      cache.set(path.relative(cwd, file), entry);
    }
  }

  function abs(id) {
    id.src = path.join(cwd, id.src);
    id.dest = path.join(cwd, id.dest);

    return id;
  }

  function dest(id) {
    return path.relative(cwd, path.join(options.dest, id));
  }

  function hook(key) {
    if (Array.isArray(options[key]) || typeof options[key] === 'string') {
      options[key] = {
        filter: options[key]
      };
    }

    filter(options[key].filter, function(rename, files, cb) {
      var _fixed = files.map(function(file) {
        var target = {
          src: file,
          dest: dest(file)
        };

        rename(target);
        return target;
      });

      _modules[key](options, collect(_fixed).map(abs))
        .then(function(result) {
          sync(result.data.files);
          save(result);

          cb(undefined, result.files.map(function(file) {
            return path.relative(cwd, file.dest);
          }));
        });
    });
  }

  var _inliner = inliner(cache),
      preloader = this.util.read(_preloader);

  this.opts.bundleOptions.globals[options.images.preloader || '_imageTag'] = function() {
    return preloader;
  };

  this.opts.bundleOptions.locals[options.images.helper || 'imageTag'] = function() {
    return _inliner.apply(null, arguments);
  };

  this.opts.bundleOptions.locals[options.images.use || 'svgUse'] = function(id) {
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

  hook('images');
  hook('sprites');
};
