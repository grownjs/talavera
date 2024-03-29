const assert = require('assert');
const talavera = require('../lib');

function lsFiles(filter) {
  return require('fast-glob').globSync(filter, { cwd: __dirname }).map(file => `${__dirname}/${file}`);
}

async function main() {
  const handlers = talavera({
    cwd: __dirname,
    chdir: true,
  });

  const images = lsFiles('**/*.{svg,png}');
  const sprites = lsFiles('**/*.{gif,png,svg,jpg,jpeg}');

  const a = await handlers.images(images);
  const b = await handlers.sprites(sprites);

  a.sort((x, y) => x.dest.localeCompare(y.dest));
  b.sort((x, y) => x.dest.localeCompare(y.dest));

  assert.equal(a.length, 5);
  assert.deepEqual(a[3], {
    id: 'github',
    src: 'social/github.png',
    dest: 'generated/social/github.png',
    root: 'social',
    path: 'generated/social/github.png',
    href: 'social/github.png',
    base: 'social/github.png',
    sizes: { '1x': 'social/github.png' },
    width: 512,
    height: 512,
    filesize: 7225,
  });
  assert.equal(a[1].dest, 'generated/images/index.css');
  assert.ok(a[1].data.includes('url(social/github.png)'));
  assert.ok(a[1].data.includes('url(twitter.png)'));
  assert.equal(a[0].id, 'code-review');
  assert.equal(a[0].root, 'github');
  assert.equal(a[0].src, a[0].base);
  assert.equal(a[0].src, 'github/code-review.svg');
  assert.equal(a[0].dest, 'generated/github/code-review.svg');
  assert.deepEqual(a[0].sizes, { '1x': 'github/code-review.svg' });

  assert.equal(b.length, 6);
  assert.equal(b[0].dest, 'generated/github.svg');
  assert.ok(b[0].data.includes('id="icon-code-review"'));

  assert.equal(b[2].dest, 'generated/social.png');
  assert.ok(b[2].data instanceof Buffer);

  assert.equal(b[1].dest, 'generated/social.css');
  assert.ok(b[1].data.includes('url(social.png)'));
}
try {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
