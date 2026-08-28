import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { presignGet, objectExists, listObjects, getObjectBuffer, isValidDate, WEEKLY_PREFIX } from '../../lib/r2';

export const dynamic = 'force-dynamic';

const MAX_SELECTION = 200;

// Prebuilt full-week zip: redirect the browser to a presigned R2 URL.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!isValidDate(date)) return new NextResponse('Valid date required (YYYY-MM-DD)', { status: 400 });

  const zipName = `cinekube-visuals-${date}.zip`;
  const key = `${WEEKLY_PREFIX}${date}/${zipName}`;

  try {
    if (!(await objectExists(key))) {
      return new NextResponse('Zip not found for this week', { status: 404 });
    }
    const url = await presignGet(key, { downloadName: zipName });
    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// On-demand zip of a user-selected subset of a week's full-size JPGs.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { date, names } = body || {};

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Valid date required (YYYY-MM-DD)' }, { status: 400 });
  }
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_SELECTION) {
    return NextResponse.json({ error: `names must be a non-empty array of at most ${MAX_SELECTION} items` }, { status: 400 });
  }

  try {
    // Only allow names that actually exist under this week's full/ prefix.
    const fullPrefix = `${WEEKLY_PREFIX}${date}/full/`;
    const validNames = new Set(
      (await listObjects(fullPrefix))
        .filter(obj => obj.Key.endsWith('.jpg'))
        .map(obj => obj.Key.slice(fullPrefix.length).replace(/\.jpg$/, ''))
    );
    const selected = [...new Set(names)].filter(name => validNames.has(name));

    if (selected.length === 0) {
      return NextResponse.json({ error: 'No matching posters for this selection' }, { status: 400 });
    }

    const files = await Promise.all(
      selected.map(async name => ({
        name: `${name}.jpg`,
        buffer: await getObjectBuffer(`${fullPrefix}${name}.jpg`),
      }))
    );

    const zip = new AdmZip();
    for (const file of files) zip.addFile(file.name, file.buffer);

    const zipName = `cinekube-visuals-${date}-selection.zip`;
    return new NextResponse(zip.toBuffer(), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to build zip' }, { status: 500 });
  }
}
