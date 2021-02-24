![Talavera](talavera.jpg)

> Quick usage (pseudo code):

```js
import talavera from 'talavera';

const { images, sprites } = talavera({
  cwd: __dirname,
  chdir: true,
  dest: './build',
  public: './public',
  prefix: 'my-icon',
  padding: 2,
  sizes: [2, 3],
  breakpoints: {
    minWidth: 150,
    steps: [
      { max: 320, ratio: 1.8 },
      { max: 520, ratio: 1.6 },
      { max: 768, ratio: 1.2 },
    ],
  },
  folders: [],
  images: { name: 'my-images' },
  sprites: { name: 'my-sprites' },
});

const imageFiles = await images(ls('**/*.{svg,png}'));
const spriteFiles = await sprites(ls('**/*.{gif,png,svg,jpg,jpeg}'));

save(imageFiles);
save(spriteFiles);

function save(files) {
  files.forEach(file => {
    if (typeof file.data === 'string') {
      write(file.dest, file.data);
    } else if (file.data instanceof Buffer) {
      write(file.dest, file.data.toString());
    } else {
      copy(file.src, file.dest);
    }
  })
}
```

[![Build status](https://github.com/pateketrueke/talavera/workflows/ci/badge.svg)](https://github.com/pateketrueke/talavera/actions)
[![NPM version](https://badge.fury.io/js/talavera.svg)](http://badge.fury.io/js/talavera)
