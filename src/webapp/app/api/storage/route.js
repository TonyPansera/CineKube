import { NextResponse } from 'next/server';
import { listObjects } from '../../lib/r2';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const objects = await listObjects('');
    const usedBytes = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
    return NextResponse.json({ usedBytes, objectCount: objects.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to compute storage usage' }, { status: 500 });
  }
}
