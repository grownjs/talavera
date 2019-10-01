const fs = require('fs');

function safeValue(obj) {
  if (typeof obj === 'object') {
    obj = JSON.stringify(obj);
  }

  return String(obj).replace(/"/g, '&quot;');
}

module.exports = (cache, options) => {
  return (id, props, _extra) => {
    let attrs = '';

    if (typeof props === 'string') {
      attrs += ' class="' + props + '"';
      props = _extra;
    }

    for (let prop in props) {
      attrs += ` ${prop}="${safeValue(props[prop])}"`;
    }

    const obj = cache.find(id);

    if (!(obj && obj.entry.sizes)) {
      return `<img src="${id}"${attrs}>`;
    }

    const keys = Object.keys(obj.entry.sizes);

    let srcSet = '';

    if (keys.length) {
      srcSet += `srcset="${keys.map(size => {
        const cached = cache.get(obj.entry.sizes[size]);

        return `${cached.href || cached.path} ${size}`;
      }).join(', ')}"`;
    }

    let placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

    // FIXME: how to configure this?
    if (obj.entry.filesize < ((options.limit || 4) * 1000)) {
      placeholder = `data:image/${obj.id.split('.').pop()};base64,${fs.readFileSync(obj.entry.dest).toString('base64')}`;
    }

    return [
      '<img src="', placeholder, '"',
      ' height="', obj.entry.height, '"',
      ' width="', obj.entry.width, '"',
      ' data-inline-ignore',
      srcSet,
      attrs,
      '>'
    ].join('');
  };
};
