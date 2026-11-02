import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch active road events from DriveBC Open511 API in JSON format
    const res = await fetch('https://api.open511.gov.bc.ca/events?status=ACTIVE&format=json', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!res.ok) throw new Error(`DriveBC API error: ${res.status}`);

    const data = await res.json();

    // Map events into a clean structure for the frontend map
    const events = (data.events || []).map((e: any) => {
      // Extract coordinates if available (Open511 provides geography points or linestrings)
      const coords = e.geography?.coordinates || [];
      // If it's a point [lon, lat], parse it; otherwise fallback
      let lat = 49.2600;
      let lon = -123.1200;
      if (e.geography?.type === 'Point' && coords.length === 2) {
        lon = coords[0];
        lat = coords[1];
      } else if (e.geography?.type === 'LineString' && coords.length > 0) {
        lon = coords[0][0];
        lat = coords[0][1];
      }

      return {
        id: e.id,
        headline: e.headline || 'Highway Event',
        description: e.description || '',
        eventType: e.event_type || 'INCIDENT', // INCIDENT, CONSTRUCTION, ROAD_CONDITION, etc.
        severity: e.severity || 'MINOR', // MINOR, MODERATE, MAJOR
        lat,
        lon,
      };
    });

    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error('DriveBC fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch DriveBC feed' }, { status: 500 });
  }
}