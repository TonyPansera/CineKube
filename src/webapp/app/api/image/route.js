import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_DIR = process.env.DATA_DIR || '/data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imagePath = searchParams.get('path');
  
  if (!imagePath) return new NextResponse('Missing path', { status: 400 });
  
  const fullPath = path.join(DATA_DIR, 'visuals', 'weekly-releases', imagePath);
  
  // Security
  if (!fullPath.startsWith(path.join(DATA_DIR, 'visuals'))) {
    return new NextResponse('Invalid path', { status: 403 });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return new NextResponse('File not found', { status: 404 });
  }
}
