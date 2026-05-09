const fs = require('fs');
const path = require('path');
const satori = require('satori').default;
const { html } = require('satori-html');
const { Resvg } = require('@resvg/resvg-js');

// Configuration
const DATA_DIR = process.env.DATA_DIR || '/data';
const JSON_FILE = path.join(DATA_DIR, 'weekly_releases.json');
const OUTPUT_DIR = path.join(DATA_DIR, 'visuals');

// Fonts
const FONT_REGULAR_PATH = path.join(__dirname, 'fonts', 'GlacialIndifference-Regular.otf');
const FONT_BOLD_PATH = path.join(__dirname, 'fonts', 'GlacialIndifference-Bold.otf');
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');

async function downloadImageAsBase64(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Determine mime type roughly
        const ext = url.split('.').pop().toLowerCase();
        let mime = 'image/jpeg';
        if (ext === 'png') mime = 'image/png';
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
        console.error(`Error downloading image ${url}:`, err.message);
        return null;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function createCoverPageHtml(movie, base64Poster, base64Logo) {
    const logoDisplay = base64Logo ? "flex" : "none";
    const textDisplay = base64Logo ? "none" : "flex";
    const logoSrc = base64Logo || "";

    return html`
        <div style="display: flex; width: 1080px; height: 1350px; background-color: #bf2728; justify-content: center; align-items: center; position: relative; font-family: 'Glacial Indifference'; color: white;">
            <div style="display: flex; width: 960px; height: 1350px; position: relative;">
                <img src="${base64Poster}" style="width: 100%; height: 100%; object-fit: cover;" />
                
                <!-- Gradients -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 350px; background-image: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%); display: flex;"></div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 600px; background-image: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%); display: flex;"></div>
                
                <!-- Header -->
                <div style="position: absolute; top: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 38px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Les sorties de la semaine</div>
                    <img src="${logoSrc}" style="display: ${logoDisplay}; height: 110px; max-width: 320px; object-fit: contain;" />
                    <div style="display: ${textDisplay}; font-size: 38px; font-weight: bold; color: #bf2728; background-color: white; padding: 10px 20px; border-radius: 8px;">CineKube</div>
                </div>
                
                <!-- Footer -->
                <div style="position: absolute; bottom: 70px; left: 50px; right: 50px; display: flex; flex-direction: column;">
                    <div style="font-size: 80px; font-weight: bold; line-height: 1.1; max-width: 860px;">${movie.title}</div>
                    <div style="font-size: 40px; margin-top: 25px; color: #e0e0e0; display: flex;">Réalisé par ${movie.director || 'Inconnu'}</div>
                    <div style="font-size: 36px; margin-top: 20px; color: #bf2728; font-weight: bold; display: flex;">Le ${formatDate(movie.french_release_date)}</div>
                </div>
            </div>
        </div>
    `;
}

function createSynopsisPageHtml(movie, base64Poster, base64Logo) {
    const logoDisplay = base64Logo ? "flex" : "none";
    const textDisplay = base64Logo ? "none" : "flex";
    const logoSrc = base64Logo || "";

    return html`
        <div style="display: flex; width: 1080px; height: 1350px; background-color: #bf2728; justify-content: center; align-items: center; position: relative; font-family: 'Glacial Indifference'; color: white;">
            <div style="display: flex; width: 960px; height: 1350px; position: relative;">
                <img src="${base64Poster}" style="width: 100%; height: 100%; object-fit: cover;" />
                
                <!-- Flat Overlay -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.75); display: flex;"></div>
                
                <!-- Header -->
                <div style="position: absolute; top: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 38px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Les sorties de la semaine</div>
                    <img src="${logoSrc}" style="display: ${logoDisplay}; height: 110px; max-width: 320px; object-fit: contain;" />
                    <div style="display: ${textDisplay}; font-size: 38px; font-weight: bold; color: #bf2728; background-color: white; padding: 10px 20px; border-radius: 8px;">CineKube</div>
                </div>
                
                <!-- Content -->
                <div style="position: absolute; top: 200px; bottom: 150px; left: 60px; right: 60px; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 55px; font-weight: bold; color: #bf2728; margin-bottom: 30px; display: flex;">SYNOPSIS</div>
                    <div style="font-size: 42px; line-height: 1.4; display: flex; flex-wrap: wrap;">${movie.overview || 'Synopsis indisponible.'}</div>
                </div>

                <!-- Footer -->
                <div style="position: absolute; bottom: 50px; right: 50px; display: flex;">
                    <div style="font-size: 28px; color: #bbbbbb;">Source : TMDB</div>
                </div>
            </div>
        </div>
    `;
}

async function renderToImage(markup, outputPath, fonts) {
    const svg = await satori(markup, {
        width: 1080,
        height: 1350,
        fonts: fonts,
    });

    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1080 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`Generated: ${outputPath}`);
}

async function main() {
    console.log('Starting Visual Generation Phase...');
    
    if (!fs.existsSync(JSON_FILE)) {
        console.error(`Error: Data file not found at ${JSON_FILE}`);
        return;
    }
    
    // Create a folder for this week's run
    const todayStr = new Date().toISOString().split('T')[0];
    const weeklyOutputDir = path.join(OUTPUT_DIR, todayStr);
    
    if (!fs.existsSync(weeklyOutputDir)) {
        fs.mkdirSync(weeklyOutputDir, { recursive: true });
    }

    // Load fonts
    const fontRegular = fs.readFileSync(FONT_REGULAR_PATH);
    const fontBold = fs.readFileSync(FONT_BOLD_PATH);
    
    const satoriFonts = [
        { name: 'Glacial Indifference', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'Glacial Indifference', data: fontBold, weight: 700, style: 'normal' }
    ];

    // Load Logo if available
    let base64Logo = null;
    if (fs.existsSync(LOGO_PATH)) {
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        base64Logo = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    
    for (const movie of data) {
        console.log(`Processing: ${movie.title}...`);
        
        const posterPaths = movie.textless_poster_paths || [];
        // Optional: fallback to default poster if no textless posters are available
        if (posterPaths.length === 0 && movie.poster_path) {
            posterPaths.push(movie.poster_path);
        }
        
        for (let i = 0; i < posterPaths.length; i++) {
            const url = `https://image.tmdb.org/t/p/original${posterPaths[i]}`;
            const base64Poster = await downloadImageAsBase64(url);
            
            if (!base64Poster) continue;

            const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const prefix = path.join(weeklyOutputDir, `${safeTitle}_poster${i + 1}`);

            // Page 1
            const html1 = createCoverPageHtml(movie, base64Poster, base64Logo);
            await renderToImage(html1, `${prefix}_page1.png`, satoriFonts);
            
            // Page 2
            const html2 = createSynopsisPageHtml(movie, base64Poster, base64Logo);
            await renderToImage(html2, `${prefix}_page2.png`, satoriFonts);
        }
    }
    
    console.log('Visual Generation Complete!');
}

main().catch(console.error);
