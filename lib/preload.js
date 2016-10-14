(function() {
  var hasCanvas;

  function isCanvasSupported() {
    if (hasCanvas === null) {
      var elem = document.createElement('canvas');
      hasCanvas = Boolean(elem.getContext && elem.getContext('2d'));
    }

    return hasCanvas;
  }

  function preload(el, src, width, height, className) {
    if (!isCanvasSupported()) {
      el.src = src;
      el.style.opacity = 1;
      return;
    }

    var p = new Image();

    p.onload = function () {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(p, 0, 0, width, height);

      el.src = canvas.toDataURL('image/png');
      el.style.opacity = 1;
      el.classList.add(className);
    };

    p.src = src;
  }

  function run() {
    var _defaultClass = 'loaded';

    Array.prototype.slice.call(document.getElementsByTagName('img'))
      .forEach(function(img) {
        var _className = img.dataset.loadedClass || _defaultClass;

        if (img.currentSrc.indexOf('data:') === -1) {
          img.classList.add(_className);
          return;
        }

        var srcset = img.getAttribute('srcset');

        if (!srcset) {
          img.classList.add(_className);
          return;
        }

        var sources = srcset.split(/\s*,\s*/)
          .map(function(source) {
            var parts = source.split(/\s+/);

            return { src: parts[0], size: parseInt(parts[1], 10) };
          });

        for (var i in sources) {
          if (Math.round(window.devicePixelRatio) === sources[i].size) {
            preload(img, sources[i].src, img.width, img.height, _className);
            break;
          }
        }
      });
  }

  (requestAnimationFrame || setTimeout)(run);
})();
