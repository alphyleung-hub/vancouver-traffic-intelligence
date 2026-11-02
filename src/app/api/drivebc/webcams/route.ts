import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.drivebc.ca/api/webcams/', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }
    });

    if (!res.ok) throw new Error(`DriveBC Webcams error: ${res.status}`);

    const data = await res.json();
    
    // Normalize data into an array whether it's wrapped or flat
    const items = Array.isArray(data) 
      ? data 
      : (data.webcams || data.features || data.data || data.entries || []);

    const webcams = items.map((cam: any) => {
      // Safely extract coordinates across various nested schemas
      const lat = Number(
        cam.latitude || 
        cam.lat || 
        cam.location?.coordinates?.[1] || 
        cam.coords?.[1] || 
        0
      );
      
      const lon = Number(
        cam.longitude || 
        cam.lon || 
        cam.location?.coordinates?.[0] || 
        cam.coords?.[0] || 
        0
      );

      // Safely extract the image URL
      const img = 
        cam.imageUrl || 
        cam.url || 
        cam.image || 
        cam.links?.image || 
        cam.properties?.IMAGE_URL || 
        '';

      return {
        id: cam.id || cam.camId || cam.identifier || Math.random(),
        name: cam.name || cam.locationName || cam.title || 'Highway Cam',
        caption: cam.caption || cam.description || '',
        imageUrl: img,
        lat,
        lon,
      };
    }).filter((cam: any) => cam.lat !== 0 && cam.lon !== 0);

    return NextResponse.json({ success: true, count: webcams.length, webcams });
  } catch (error: any) {
    console.error('HighwayCams fetch error:', error.message);
    return NextResponse.json({ success: true, count: 0, webcams: [] });
  }
}