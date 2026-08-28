import { NextResponse } from 'next/server';
import { listObjects, presignGet, isValidDate, WEEKLY_PREFIX } from '../../lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Valid date required (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const thumbs = await listObjects(`${WEEKLY_PREFIX}${date}/thumbs/`);

    const images = await Promise.all(
      thumbs
        .filter(obj => obj.Key.endsWith('.webp'))
        .map(async obj => {
          const base = obj.Key.split('/').pop().replace(/\.webp$/, '');
          const [thumbUrl, fullUrl] = await Promise.all([
            presignGet(obj.Key),
            presignGet(`${WEEKLY_PREFIX}${date}/full/${base}.jpg`, { downloadName: `${base}.jpg` }),
          ]);
          return { name: base, thumbUrl, fullUrl };
        })
    );

    return NextResponse.json({ images });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to list images from R2' }, { status: 500 });
  }
}
