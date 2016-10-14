(function() {
  var hasCanvas;

  function isCanvasSupported() {
    if (hasCanvas === null) {
      var elem = document.createElement('canvas');
      hasCanvas = Boolean(elem.getContext && elem.getContext('2d'));
    }

    return hasCanvas;
  }

  function preload(el, src, width, height) {
    if (el.currentSrc.indexOf('data:') === -1) {
      el.style.opacity = 1;
      return;
    }

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
    };

    p.src = src;
  }

  return function(nodes) {
    nodes.forEach(function(img) {
      var sources = img.getAttribute('srcset').split(/\s*,\s*/)
        .map(function(source) {
          var parts = source.split(/\s+/);

          return { src: parts[0], size: parseInt(parts[1], 10) };
        });

      for (var i in sources) {
        if (Math.round(window.devicePixelRatio) === sources[i].size) {
          preload(img, sources[i].src, img.width, img.height);
          break;
        }
      }
    });
  };
}());
