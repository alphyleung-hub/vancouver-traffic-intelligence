import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Check header or query parameter for manual key input, fallback to environment variable
  const headerKey = request.headers.get('x-translink-key');
  const queryKey = request.nextUrl.searchParams.get('apikey');
  const apiKey = headerKey || queryKey || process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API key missing' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://gtfsapi.translink.ca/v3/gtfsposition?apikey=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 15 }
    });

    if (!response.ok) {
      throw new Error(`TransLink GTFS position error: ${response.status}`);
    }

    const data = await response.json();
    const entities = data.entity || [];
    
    const buses = entities
      .filter((entity: any) => entity.vehicle && entity.vehicle.position)
      .map((entity: any) => ({
        VehicleNo: entity.vehicle.vehicle?.id || entity.id,
        Route: entity.vehicle.trip?.routeId || 'Unknown',
        Latitude: entity.vehicle.position.latitude,
        Longitude: entity.vehicle.position.longitude,
        Destination: entity.vehicle.trip?.tripId || 'Live Transit Unit'
      }));

    return NextResponse.json(buses, {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=20'
      }
    });

  } catch (error: any) {
    console.error('Failed to fetch TransLink vehicle positions:', error.message);
    return NextResponse.json({ error: 'Failed to fetch live vehicle positions' }, { status: 500 });
  }
}