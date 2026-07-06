/**
 * Genera los iconos de la app desde la corona KAIRAS (blanca sobre
 * transparente) compuesta sobre el negro de marca #0D090B:
 * - src/app/icon.png       512×512, esquinas redondeadas (favicon/pestañas)
 * - src/app/apple-icon.png 180×180, cuadrado (iOS lo redondea solo)
 * Ejecutar: npx tsx scripts/generate-icons.ts
 */
import sharp from "sharp";

const SOURCE = "public/brand/kairas-mark.png";
const INK = "#0d090b";

async function generate(size: number, radius: number, output: string) {
  const markSize = Math.round(size * 0.72);
  const mark = await sharp(SOURCE)
    .trim() // recorta el aire transparente alrededor de la corona
    .resize(markSize, markSize, {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const markMeta = await sharp(mark).metadata();

  const background = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
     </svg>`,
  );

  await sharp(background)
    .png()
    .composite([
      {
        input: mark,
        left: Math.round((size - (markMeta.width ?? markSize)) / 2),
        top: Math.round((size - (markMeta.height ?? markSize)) / 2),
      },
    ])
    .toFile(output);
  console.log(`✓ ${output} (${size}×${size})`);
}

async function main() {
  await generate(512, 96, "src/app/icon.png");
  await generate(180, 0, "src/app/apple-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
