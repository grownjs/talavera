const fs = require('fs');

function safeValue(obj) {
  if (typeof obj === 'object') {
    obj = JSON.stringify(obj);
  }

  return String(obj).replace(/"/g, '&quot;');
}

module.exports = (cache, options) => {
  return props => {
    let attrs = '';

    for (let prop in props) {
      if (prop !== 'src' && prop !== 'body') {
        attrs += ` ${prop}="${safeValue(props[prop])}"`;
      }
    }

    const obj = cache.find(props.src);

    if (!(obj && obj.entry.sizes)) {
      return `<img src="${props.src}"${attrs}>`;
    }

    const keys = Object.keys(obj.entry.sizes);

    let srcSet = '';

    if (keys.length) {
      srcSet += ` srcset="${keys.map(size => {
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
