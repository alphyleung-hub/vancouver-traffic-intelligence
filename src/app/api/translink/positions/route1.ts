import { NextResponse, NextRequest } from 'next/server';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export async function GET(request: NextRequest) {
  const headerKey = request.headers.get('x-translink-key');
  const queryKey = request.nextUrl.searchParams.get('apikey');
  const apiKey = headerKey || queryKey || process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API key missing' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://gtfsapi.translink.ca/v3/gtfsposition?apikey=${apiKey}`, {
      headers: { 'Accept': 'application/x-protobuf' },
      next: { revalidate: 10 }
    });

    if (!res.ok) {
      throw new Error(`TransLink API error: ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    const vehicles = feed.entity
      .filter((e) => e.vehicle && e.vehicle.position)
      .map((e) => {
        const vehicleData = e.vehicle;
        // Extract public route number (e.g. "240", "401", "R4", "99")
        const routeNo = vehicleData?.trip?.routeId || 'Bus';
        const vehicleId = vehicleData?.vehicle?.id || e.id || 'Unit';

        return {
          id: vehicleId,
          routeNumber: String(routeNo).trim(),
          lat: vehicleData?.position?.latitude || 0,
          lon: vehicleData?.position?.longitude || 0,
        };
      });

    return NextResponse.json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error: any) {
    console.error('GTFS-RT fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to parse GTFS feed' }, { status: 500 });
  }
}