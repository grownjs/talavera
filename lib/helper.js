function safeValue(obj) {
  if (typeof obj === 'object') {
    obj = JSON.stringify(obj);
  }

  return String(obj).replace(/"/g, '&quot;');
}

module.exports = function(src) {
  return function(id, props) {
    var image = src.files[src.map[id]],
        sizes = Object.keys(image.sizes);

    var srcSet = '';

    if (sizes.length > 1) {
      srcSet += ' srcset="' + sizes.map(function(size) {
        return src.files[image.sizes[size]].path.absolute + ' ' + size;
      }).join(', ') + '"';
    }

    var attrs = '';

    if (typeof props === 'string') {
      attrs += ' class="' + props + '"';
      props = arguments[2];
    }

    for (var prop in props) {
      attrs += ' ' + prop + '="' + safeValue(props[prop]) + '"';
    }

    return [
      '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="',
      ' height="', image.height, '"',
      ' width="', image.width, '"',
      srcSet,
      attrs,
      '>'
    ].join('');
  };
};
