const path = require('path');
const fs = require('fs/promises');
const { Jimp } = require('jimp');
const potrace = require('potrace');

function toTraceSvg(imagePath, options) {
  return new Promise((resolve, reject) => {
    potrace.trace(imagePath, options, (err, svg) => {
      if (err) return reject(err);
      resolve(svg);
    });
  });
}

async function preprocessForLineTrace(inputPath, outputPath, threshold = 210) {
  const img = await Jimp.read(inputPath);

  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const isForeground = a > 0 && luminance < threshold;

    if (isForeground) {
      this.bitmap.data[idx + 0] = 0;
      this.bitmap.data[idx + 1] = 0;
      this.bitmap.data[idx + 2] = 0;
      this.bitmap.data[idx + 3] = 255;
    } else {
      this.bitmap.data[idx + 0] = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
      this.bitmap.data[idx + 3] = 255;
    }
  });

  await img.write(outputPath);
  return outputPath;
}

async function generate({ input, output, threshold }) {
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output);
  const tempPath = outputPath.replace(/\.svg$/i, '.trace-input.png');

  await preprocessForLineTrace(inputPath, tempPath, threshold);

  const svg = await toTraceSvg(tempPath, {
    turdSize: 1,
    threshold: 120,
    blackOnWhite: true,
    color: '#5b4634',
    background: 'transparent',
    optCurve: true,
    optTolerance: 0.12,
    alphaMax: 1,
    turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
  });

  await fs.writeFile(outputPath, svg, 'utf8');
  await fs.rm(tempPath, { force: true });

  console.log(`generated: ${output}`);
}

async function main() {
  const base = path.resolve('public/anatomy');

  await generate({
    input: path.join(base, 'dog-outline.png'),
    output: path.join(base, 'dog-traced.svg'),
    threshold: 212,
  });

  await generate({
    input: path.join(base, 'cat-outline.png'),
    output: path.join(base, 'cat-traced.svg'),
    threshold: 220,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
