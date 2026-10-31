import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return safe dummy/empty structures so the map component never receives HTML or undefined data
    return NextResponse.json(
      { webcams: [], events: [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}