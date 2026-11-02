import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://catalogue.data.gov.bc.ca/dataset/6b39a910-6c77-476f-ac96-7b4f18849b1c/resource/a9d52d85-8402-4ce7-b2ac-0d5ee0f33166/download/highwaycams.json', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }
    });

    if (!res.ok) throw new Error('Failed to download dataset');

    const data = await res.json();
    const features = data.features || [];

    const webcams = features.map((feat: any) => {
      const p = feat.properties || {};
      const coords = feat.geometry?.coordinates || [];

      return {
        id: p.camId || p.ID || p.id || Math.random(),
        name: p.name || p.LOCATION || p.LocationName || 'Highway Cam',
        caption: p.description || p.CAPTION || p.Description || '',
        imageUrl: p.url || p.IMAGE_URL || p.imageUrl || p.URL || '',
        lat: coords.length === 2 ? coords[1] : 0,
        lon: coords.length === 2 ? coords[0] : 0,
      };
    }).filter((cam: any) => cam.lat !== 0 && cam.lon !== 0);

    return NextResponse.json({ success: true, count: webcams.length, webcams });
  } catch (error: any) {
    console.error('HighwayCams error:', error.message);
    return NextResponse.json({ success: false, count: 0, webcams: [] });
  }
}