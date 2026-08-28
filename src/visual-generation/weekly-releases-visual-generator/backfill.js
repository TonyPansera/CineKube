const fs = require('fs');
const path = require('path');
const { hasR2Credentials, createClient, uploadFile } = require('./r2');
const { publishWeek } = require('./publish');

const DATA_DIR = process.env.DATA_DIR || '/data';
const OUTPUT_DIR = path.join(DATA_DIR, 'visuals', 'weekly-releases');
const JSON_FILE = path.join(DATA_DIR, 'weekly_releases.json');

// One-off migration: publish every already-generated week folder to R2.
async function main() {
    if (!hasR2Credentials()) {
        throw new Error('R2 credentials missing (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).');
    }
    if (!fs.existsSync(OUTPUT_DIR)) {
        throw new Error(`No visuals directory at ${OUTPUT_DIR}.`);
    }

    const client = createClient();
    const dates = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .sort();

    for (const date of dates) {
        await publishWeek(client, path.join(OUTPUT_DIR, date), date);
    }

    if (fs.existsSync(JSON_FILE)) {
        await uploadFile(client, JSON_FILE, 'data/weekly_releases.json', 'application/json');
    }

    console.log(`Backfill complete: ${dates.length} week(s) published.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
