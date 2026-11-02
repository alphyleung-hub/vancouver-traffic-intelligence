import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.drivebc.ca/api/webcams/', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) throw new Error(`DriveBC Webcams error: ${res.status}`);

    const data = await res.json();
    // DriveBC returns an array or object containing webcam entries
    const items = Array.isArray(data) ? data : (data.webcams || data.features || []);

    const webcams = items.map((cam: any) => {
      // Handle different formats (lat/lon properties vs geometry coordinates)
      const lat = cam.latitude || cam.lat || (cam.geometry?.coordinates ? cam.geometry.coordinates[1] : 0);
      const lon = cam.longitude || cam.lon || (cam.geometry?.coordinates ? cam.geometry.coordinates[0] : 0);
      
      // Extract image URL safely
      const img = cam.imageUrl || cam.url || cam.links?.image || (cam.properties && (cam.properties.IMAGE_URL || cam.properties.url)) || '';

      return {
        id: cam.id || cam.camId || Math.random(),
        name: cam.name || cam.locationName || 'Highway Cam',
        caption: cam.caption || cam.description || '',
        imageUrl: img,
        lat: Number(lat),
        lon: Number(lon),
      };
    }).filter((cam: any) => cam.lat !== 0 && cam.lon !== 0);

    return NextResponse.json({ success: true, count: webcams.length, webcams });
  } catch (error: any) {
    console.error('HighwayCams fetch error:', error.message);
    return NextResponse.json({ success: true, count: 0, webcams: [] });
  }
}