import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.open511.gov.bc.ca/webcams?format=json', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 } // Cache list for 2 minutes
    });

    if (!res.ok) throw new Error(`DriveBC Webcams API error: ${res.status}`);

    const data = await res.json();

    const webcams = (data.webcams || []).map((cam: any) => {
      const coords = cam.geography?.coordinates || [];
      return {
        id: cam.id,
        name: cam.name || 'BC HighwayCam',
        caption: cam.caption || '',
        imageUrl: cam.links?.image || '',
        updateUrl: cam.links?.update || '',
        lat: coords.length === 2 ? coords[1] : 0,
        lon: coords.length === 2 ? coords[0] : 0,
      };
    }).filter((cam: any) => cam.lat !== 0 && cam.lon !== 0);

    return NextResponse.json({ success: true, count: webcams.length, webcams });
  } catch (error: any) {
    console.error('DriveBC Webcams fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch HighwayCams' }, { status: 500 });
  }
}