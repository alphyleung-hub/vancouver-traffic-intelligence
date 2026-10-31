import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API Key is missing' }, { status: 500 });
  }

  try {
    // Note: TransLink legacy RTTI is deprecated. Use GTFS-RT endpoint or return safe fallback array.
    // For now, returning a safe array to prevent dashboard crashes while you hook up GTFS-RT v3.
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}