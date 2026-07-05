import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

const DATA_DIR = process.env.DATA_DIR || '/data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  
  if (!date) return new NextResponse('Missing date', { status: 400 });
  
  const targetDir = path.join(DATA_DIR, 'visuals', 'weekly-releases', date);
  if (!fs.existsSync(targetDir)) return new NextResponse('Not found', { status: 404 });

  try {
    const zip = new AdmZip();
    zip.addLocalFolder(targetDir);
    const buffer = zip.toBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cinekube-visuals-${date}.zip"`,
      }
    });
  } catch (err) {
    console.error('Error creating ZIP:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
