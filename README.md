![Talavera](talavera.jpg)

> Quick usage (pseudo code):

```js
import talavera from 'talavera';

const { images, sprites } = talavera({ out: '/tmp' });

const imageFiles = await images(ls('**/*.{svg,png}'));
const spriteFiles = await sprites(ls('**/*.{gif,png,svg,jpg,jpeg}'));

write(imageFiles);
write(spriteFiles);

function write(files) {
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
