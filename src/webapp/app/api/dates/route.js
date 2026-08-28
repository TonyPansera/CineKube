import { NextResponse } from 'next/server';
import { listCommonPrefixes, WEEKLY_PREFIX } from '../../lib/r2';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prefixes = await listCommonPrefixes(WEEKLY_PREFIX);
    const dates = prefixes
      .map(p => p.slice(WEEKLY_PREFIX.length).replace(/\/$/, ''))
      .sort((a, b) => b.localeCompare(a)); // Newest first

    return NextResponse.json({ dates });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to list weeks from R2' }, { status: 500 });
  }
}
