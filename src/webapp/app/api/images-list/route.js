import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_DIR = process.env.DATA_DIR || '/data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  
  if (!date) {
    return NextResponse.json({ error: 'Date required' }, { status: 400 });
  }
  
  const targetDir = path.join(DATA_DIR, 'visuals', 'weekly-releases', date);
  
  try {
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ images: [] });
    }
    
    const items = fs.readdirSync(targetDir);
    const images = items.filter(item => item.endsWith('.png'));
    
    return NextResponse.json({ images });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
