const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const AdmZip = require('adm-zip');
const { uploadFile } = require('./r2');

const R2_PREFIX = 'weekly-releases';

// Converts a week folder of rendered PNGs into web-ready assets and uploads
// them to R2: full-size JPEG (q90), 480px WebP thumbnail, and one zip of the
// JPEGs for the "download all" button.
async function publishWeek(client, weekDir, date) {
    const pngs = fs.readdirSync(weekDir).filter(f => f.endsWith('.png')).sort();
    if (pngs.length === 0) {
        console.log(`No PNGs found in ${weekDir}, nothing to publish.`);
        return;
    }

    console.log(`Publishing ${pngs.length} images for ${date}...`);
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `cinekube-publish-`));
    const jpegDir = path.join(workDir, 'jpeg');
    fs.mkdirSync(jpegDir);

    try {
        for (const png of pngs) {
            const src = path.join(weekDir, png);
            const base = png.replace(/\.png$/, '');

            const jpegPath = path.join(jpegDir, `${base}.jpg`);
            await sharp(src).jpeg({ quality: 90 }).toFile(jpegPath);
            await uploadFile(client, jpegPath, `${R2_PREFIX}/${date}/full/${base}.jpg`, 'image/jpeg');

            const thumbPath = path.join(workDir, `${base}.webp`);
            await sharp(src).resize({ width: 480 }).webp({ quality: 75 }).toFile(thumbPath);
            await uploadFile(client, thumbPath, `${R2_PREFIX}/${date}/thumbs/${base}.webp`, 'image/webp');
        }

        const zip = new AdmZip();
        zip.addLocalFolder(jpegDir);
        const zipName = `cinekube-visuals-${date}.zip`;
        const zipPath = path.join(workDir, zipName);
        zip.writeZip(zipPath);
        await uploadFile(client, zipPath, `${R2_PREFIX}/${date}/${zipName}`, 'application/zip');

        console.log(`Published week ${date}.`);
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}

module.exports = { publishWeek, R2_PREFIX };
