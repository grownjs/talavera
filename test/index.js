const assert = require('assert');
const talavera = require('../lib');

function lsFiles(filter) {
  return require('glob').sync(filter, { cwd: __dirname }).map(file => `${__dirname}/${file}`);
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

  assert.equal(a.length, 5);
  assert.deepEqual(a[0], { src: 'social/github.png', dest: 'generated/social/github.png' });
  assert.deepEqual(a[1], { src: 'social/twitter.png', dest: 'generated/social/twitter.png' });
  assert.equal(a[2].dest, 'generated/images.css');
  assert.ok(a[2].data.includes('url(social/github.png)'));
  assert.ok(a[2].data.includes('url(social/twitter.png)'));
  assert.equal(a[3].id, 'code-review');
  assert.equal(a[3].root, 'github');
  assert.equal(a[3].src, a[3].base);
  assert.equal(a[3].src, 'github/code-review.svg');
  assert.equal(a[3].dest, 'generated/github/code-review.svg');
  assert.deepEqual(a[3].sizes, { '1x': 'github/code-review.svg' });

  assert.equal(b.length, 3);
  assert.equal(b[0].dest, 'generated/github.svg');
  assert.ok(b[0].data.includes('id="icon-code-review"'));

  assert.equal(b[1].dest, 'generated/social.png');
  assert.ok(b[1].data instanceof Buffer);

  assert.equal(b[2].dest, 'generated/social.css');
  assert.ok(b[2].data.includes('url(social.png)'));
}
try {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
