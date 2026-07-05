const fs = require('fs');
const path = require('path');
const satori = require('satori').default;
const { html } = require('satori-html');
const { Resvg } = require('@resvg/resvg-js');

// Configuration
const DATA_DIR = process.env.DATA_DIR || '/data';
const JSON_FILE = path.join(DATA_DIR, 'monthly_suggestions.json');
const OUTPUT_DIR = path.join(DATA_DIR, 'visuals', 'monthly-recommandations');

// Fonts
const FONT_REGULAR_PATH = path.join(__dirname, 'fonts', 'Montserrat-Regular.otf');
const FONT_BOLD_PATH = path.join(__dirname, 'fonts', 'Montserrat-SemiBold.otf');
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

function createCoverPageHtml(movie, base64Poster, base64Logo) {
    const logoDisplay = base64Logo ? "flex" : "none";
    const textDisplay = base64Logo ? "none" : "flex";
    const logoSrc = base64Logo || "";

    // Display only the year from theatrical_release_date
    const yearDisplay = movie.theatrical_release_date
        ? movie.theatrical_release_date.substring(0, 4)
        : 'Date inconnue';

    return html`
        <div style="display: flex; width: 1080px; height: 1350px; background-image: linear-gradient(180deg, #E40303 0%, #E40303 16.6%, #FF8C00 16.6%, #FF8C00 33.3%, #FFED00 33.3%, #FFED00 50%, #008026 50%, #008026 66.6%, #004CFF 66.6%, #004CFF 83.3%, #732982 83.3%, #732982 100%); justify-content: center; align-items: center; position: relative; font-family: 'Montserrat'; color: white;">            <div style="display: flex; width: 960px; height: 1350px; position: relative;">
                <img src="${base64Poster}" style="width: 100%; height: 100%; object-fit: cover;" />
                
                <!-- Gradients -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 350px; background-image: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%); display: flex;"></div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 600px; background-image: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%); display: flex;"></div>
                
                <!-- Header -->
                <div style="position: absolute; top: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 38px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Nos recommandations du mois</div>
                    <img src="${logoSrc}" style="display: ${logoDisplay}; height: 110px; max-width: 320px; object-fit: contain;" />
                    <div style="display: ${textDisplay}; font-size: 38px; font-weight: bold; color: #bf2728; background-color: white; padding: 10px 20px; border-radius: 8px;">CineKube</div>
                </div>
                
                <!-- Footer -->
                <div style="position: absolute; bottom: 70px; left: 50px; right: 50px; display: flex; flex-direction: column;">
                    <div style="font-size: 80px; font-weight: bold; line-height: 1.1; max-width: 860px;">${movie.title}</div>
                    <div style="font-size: 40px; margin-top: 25px; color: #e0e0e0; display: flex;">Réalisé par ${movie.director || 'Inconnu'}</div>
                    <div style="font-size: 36px; margin-top: 20px; color: #bf2728; font-weight: bold; display: flex;">${yearDisplay}</div>
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
        <div style="display: flex; width: 1080px; height: 1350px; background-image: linear-gradient(180deg, #E40303 0%, #E40303 16.6%, #FF8C00 16.6%, #FF8C00 33.3%, #FFED00 33.3%, #FFED00 50%, #008026 50%, #008026 66.6%, #004CFF 66.6%, #004CFF 83.3%, #732982 83.3%, #732982 100%); justify-content: center; align-items: center; position: relative; font-family: 'Montserrat'; color: white;">            <div style="display: flex; width: 960px; height: 1350px; position: relative;">
            <div style="display: flex; width: 960px; height: 1350px; position: relative;">
                <img src="${base64Poster}" style="width: 100%; height: 100%; object-fit: cover;" />
                
                <!-- Flat Overlay -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.75); display: flex;"></div>
                
                <!-- Header -->
                <div style="position: absolute; top: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 38px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Nos recommandations du mois</div>
                    <img src="${logoSrc}" style="display: ${logoDisplay}; height: 110px; max-width: 320px; object-fit: contain;" />
                    <div style="display: ${textDisplay}; font-size: 38px; font-weight: bold; color: #bf2728; background-color: white; padding: 10px 20px; border-radius: 8px;">CineKube</div>
                </div>
                
                <!-- Content -->
                <div style="position: absolute; top: 200px; bottom: 150px; left: 60px; right: 60px; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 55px; font-weight: bold; color: #bf2728; margin-bottom: 30px; display: flex;">SYNOPSIS</div>
                    <div style="font-size: 40px; line-height: 1.4; display: flex; flex-wrap: wrap;">${movie.overview || 'Synopsis indisponible.'}</div>
                </div>

                <!-- Footer -->
                <div style="position: absolute; bottom: 50px; right: 50px; display: flex;">
                    <div style="font-size: 28px; color: #bbbbbb;">Source : TMDB</div>
                </div>
            </div>
        </div>
    `;
}

function createAnalysisPageHtml(movie, base64Poster, base64Logo) {
    const logoDisplay = base64Logo ? "flex" : "none";
    const textDisplay = base64Logo ? "none" : "flex";
    const logoSrc = base64Logo || "";

    const analyses = movie.analyses && movie.analyses.length > 0 ? movie.analyses : [movie.analysis || 'Analyse en cours de rédaction...'];
    const analysisCards = analyses.map((analysis) => ({
        type: 'div',
        props: {
            style: {
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: '30px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                color: '#111',
                boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
            },
            children: [
                {
                    type: 'div',
                    props: {
                        style: {
                            fontSize: '34px',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                        },
                        children: analysis,
                    },
                },
            ],
        },
    }));

    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                width: '1080px',
                height: '1350px',
                backgroundColor: '#bf2728',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                fontFamily: 'Montserrat',
                color: 'white',
            },
            children: [
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            width: '960px',
                            height: '1350px',
                            position: 'relative',
                        },
                        children: [
                            {
                                type: 'img',
                                props: {
                                    src: base64Poster,
                                    style: {
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    },
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        right: '0',
                                        bottom: '0',
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        display: 'flex',
                                    },
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        position: 'absolute',
                                        top: '50px',
                                        left: '50px',
                                        right: '50px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    },
                                    children: [
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    fontSize: '38px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '2px',
                                                },
                                                children: 'Nos recommandations du mois',
                                            },
                                        },
                                        {
                                            type: 'img',
                                            props: {
                                                src: logoSrc,
                                                style: {
                                                    display: logoDisplay,
                                                    height: '110px',
                                                    maxWidth: '320px',
                                                    objectFit: 'contain',
                                                },
                                            },
                                        },
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    display: textDisplay,
                                                    fontSize: '38px',
                                                    fontWeight: 'bold',
                                                    color: '#bf2728',
                                                    backgroundColor: 'white',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                },
                                                children: 'CineKube',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        position: 'absolute',
                                        top: '200px',
                                        bottom: '150px',
                                        left: '60px',
                                        right: '60px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                    },
                                    children: [
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    fontSize: '55px',
                                                    fontWeight: 'bold',
                                                    color: '#bf2728',
                                                    marginBottom: '30px',
                                                    display: 'flex',
                                                },
                                                children: "L'avis de nos membres",
                                            },
                                        },
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '20px',
                                                },
                                                children: analysisCards,
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        position: 'absolute',
                                        bottom: '50px',
                                        right: '50px',
                                        display: 'flex',
                                    },
                                    children: [
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    fontSize: '28px',
                                                    color: '#bbbbbb',
                                                },
                                                children: 'Source : Devinci Lumière',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
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
    console.log('Starting Monthly Suggestions Visual Generation...');
    
    if (!fs.existsSync(JSON_FILE)) {
        console.error(`Error: Data file not found at ${JSON_FILE}`);
        return;
    }
    
    // Create a folder for this month's run using today's date (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];
    const monthlyOutputDir = path.join(OUTPUT_DIR, todayStr);
    
    // Ensure the full directory tree exists: /data/visuals/monthly-recommandations/YYYY-MM-DD/
    fs.mkdirSync(monthlyOutputDir, { recursive: true });

    // Load fonts
    const fontRegular = fs.readFileSync(FONT_REGULAR_PATH);
    const fontBold = fs.readFileSync(FONT_BOLD_PATH);
    
    const satoriFonts = [
        { name: 'Montserrat', data: fontRegular, weight: 500, style: 'normal' },
        { name: 'Montserrat', data: fontBold, weight: 700, style: 'normal' }
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
        // Fallback to default poster if no textless posters are available
        if (posterPaths.length === 0 && movie.poster_path) {
            posterPaths.push(movie.poster_path);
        }
        
        for (let i = 0; i < posterPaths.length; i++) {
            const url = `https://image.tmdb.org/t/p/original${posterPaths[i]}`;
            const base64Poster = await downloadImageAsBase64(url);
            
            if (!base64Poster) continue;

            const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const prefix = path.join(monthlyOutputDir, `${safeTitle}_poster${i + 1}`);

            // Page 1 - Cover
            const html1 = createCoverPageHtml(movie, base64Poster, base64Logo);
            await renderToImage(html1, `${prefix}_page1.png`, satoriFonts);
            
            // Page 2 - Synopsis
            const html2 = createSynopsisPageHtml(movie, base64Poster, base64Logo);
            await renderToImage(html2, `${prefix}_page2.png`, satoriFonts);

            // Page 3 - Analysis
            const html3 = createAnalysisPageHtml(movie, base64Poster, base64Logo);
            await renderToImage(html3, `${prefix}_page3.png`, satoriFonts);
        }
    }
    
    console.log('Monthly Suggestions Visual Generation Complete!');
}

main().catch(console.error);
