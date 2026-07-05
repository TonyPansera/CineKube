import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_DIR = process.env.DATA_DIR || '/data';
const VISUALS_DIR = path.join(DATA_DIR, 'visuals', 'weekly-releases');

export async function GET() {
  try {
    if (!fs.existsSync(VISUALS_DIR)) {
      return NextResponse.json({ dates: [] });
    }
    
    // Read directories inside weekly-releases
    const items = fs.readdirSync(VISUALS_DIR, { withFileTypes: true });
    const dates = items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .sort((a, b) => b.localeCompare(a)); // Newest first
      
    return NextResponse.json({ dates });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
