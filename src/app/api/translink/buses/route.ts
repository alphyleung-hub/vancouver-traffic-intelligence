import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API Key is missing in environment variables' }, { status: 500 });
  }

  try {
    // TransLink official GTFS-RT JSON vehicle positions endpoint
    const response = await fetch(`https://api.translink.ca/gtfsrt/v1/vehiclepositions?apikey=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 10 } // Cache and revalidate every 10 seconds
    });

    if (!response.ok) {
      throw new Error(`TransLink API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Parse GTFS-RT entities into clean flat vehicle objects for the map
    const entities = data.entity || [];
    const buses = entities
      .filter((entity: any) => entity.vehicle && entity.vehicle.position)
      .map((entity: any) => {
        const v = entity.vehicle;
        return {
          VehicleNo: v.vehicle?.id || v.trip?.tripId || 'Unknown',
          Route: v.trip?.routeId || 'Bus',
          Destination: v.trip?.headsign || 'Metro Vancouver',
          Latitude: v.position.latitude,
          Longitude: v.position.longitude,
        };
      });

    return NextResponse.json(buses, {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=20'
      }
    });

  } catch (error: any) {
    console.error('Error fetching live TransLink buses:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}