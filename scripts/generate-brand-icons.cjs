// All browser icons are rendered from the official brand asset.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const source = await fs.readFile(path.join(root, 'public/gridstock-mark.svg'));
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header[entry] = sizes[index];
    header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  await fs.writeFile(path.join(root, 'src/app/favicon.ico'), Buffer.concat([header, ...images]));
  await fs.writeFile(path.join(root, 'public/favicon-32x32.png'), images[1]);
  console.log('Generated ICO (16/32/48 px) and PNG from gridstock-mark.svg.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
