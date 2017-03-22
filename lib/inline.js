var fs = require('fs');

function safeValue(obj) {
  if (typeof obj === 'object') {
    obj = JSON.stringify(obj);
  }

  return String(obj).replace(/"/g, '&quot;');
}

module.exports = function(cache, options) {
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

    if (!(obj && obj.entry.sizes)) {
      return '<img src="' + id + '"' + attrs + '>';
    }

    var keys = Object.keys(obj.entry.sizes);

    var srcSet = '';
    var baseUrl = '/';

    if (keys.length) {
      srcSet += ' srcset="' + keys.map(function(size) {
        return baseUrl + cache.get(obj.entry.sizes[size]).path + ' ' + size;
      }).join(', ') + '"';
    }

    var placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

    // FIXME: how to configure this?
    if (obj.entry.filesize < ((options.limit || 4) * 1000)) {
      placeholder = [
        'data:image/', obj.id.split('.').pop(), ';base64,',
        fs.readFileSync(obj.entry.dest).toString('base64'),
      ].join('');
    }

    return [
      '<img src="', placeholder, '"',
      ' height="', obj.entry.height, '"',
      ' width="', obj.entry.width, '"',
      srcSet,
      attrs,
      '>'
    ].join('');
  };
};
