import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Querying BC Parks REST/GraphQL endpoints or public facility records
    const res = await fetch('https://bcparksapi.env.gov.bc.ca/api/protected-areas?fields=facilities,parking', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!res.ok) throw new Error(`BC Parks API error: ${res.status}`);

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.data || data.items || []);

    const parkingLocations = items.flatMap((park: any) => {
      const facilities = park.facilities || park.parkFacilities || [];
      // Filter for parking facilities or lots
      return facilities
        .filter((f: any) => f.facilityName?.toLowerCase().includes('parking') || f.type === 'Parking')
        .map((f: any) => ({
          id: f.id || Math.random(),
          name: `${park.protectedAreaName || 'Park'} - Parking`,
          description: f.description || 'Park parking facility',
          lat: f.latitude || park.latitude || 0,
          lon: f.longitude || park.longitude || 0,
        }));
    }).filter((p: any) => p.lat !== 0 && p.lon !== 0);

    return NextResponse.json({ success: true, count: parkingLocations.length, parking: parkingLocations });
  } catch (error: any) {
    console.error('BC Parks fetch error:', error.message);
    // Return graceful fallback so map doesn't break if API is restricted
    return NextResponse.json({ success: true, count: 0, parking: [] });
  }
}