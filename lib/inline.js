function safeValue(obj) {
  if (typeof obj === 'object') {
    obj = JSON.stringify(obj);
  }

  return String(obj).replace(/"/g, '&quot;');
}

module.exports = function(cache) {
  return function(id, props) {
    var attrs = '';

    if (typeof props === 'string') {
      attrs += ' class="' + props + '"';
      props = arguments[2];
    }

    for (var prop in props) {
      attrs += ' ' + prop + '="' + safeValue(props[prop]) + '"';
    }

    var obj = cache.find(id);

    if (!obj) {
      return '<img src="' + id + '"' + attrs + '>';
    }

    var keys = Object.keys(obj.entry.sizes);

    var srcSet = '';
    var baseUrl = '/';

    if (keys.length > 1) {
      srcSet += ' srcset="' + keys.map(function(size) {
        return baseUrl + cache.get(obj.entry.sizes[size]).path + ' ' + size;
      }).join(', ') + '"';
    }

    return [
      '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="',
      ' height="', obj.entry.height, '"',
      ' width="', obj.entry.width, '"',
      srcSet,
      attrs,
      '>'
    ].join('');
  };
};
