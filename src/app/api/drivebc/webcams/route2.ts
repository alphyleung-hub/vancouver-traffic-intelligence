import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Official BC Government HighwayCams GeoJSON resource URL
    const res = await fetch('https://catalogue.data.gov.bc.ca/dataset/6b39a910-6c77-476f-ac96-7b4f18849b1c/resource/a9d52d85-8402-4ce7-b2ac-0d5ee0f33166/download/highwaycams.json', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) {
      // Fallback response if catalogue is temporarily unavailable
      return NextResponse.json({ success: true, count: 0, webcams: [] });
    }

    const data = await res.json();
    const features = data.features || [];

    const webcams = features.map((feat: any) => {
      const props = feat.properties || {};
      const coords = feat.geometry?.coordinates || [];
      return {
        id: props.camId || props.ID || Math.random(),
        name: props.name || props.LOCATION || 'HighwayCam',
        caption: props.description || props.CAPTION || '',
        imageUrl: props.url || props.IMAGE_URL || '',
        lat: coords.length === 2 ? coords[1] : 0,
        lon: coords.length === 2 ? coords[0] : 0,
      };
    }).filter((cam: any) => cam.lat !== 0 && cam.lon !== 0);

    return NextResponse.json({ success: true, count: webcams.length, webcams });
  } catch (error: any) {
    console.error('HighwayCams fetch error:', error.message);
    return NextResponse.json({ success: true, count: 0, webcams: [] });
  }
}