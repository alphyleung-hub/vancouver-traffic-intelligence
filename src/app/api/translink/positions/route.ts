import { NextResponse } from 'next/server';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export async function GET() {
  const apiKey = process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API key missing in environment' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://gtfsapi.translink.ca/v3/gtfsposition?apikey=${apiKey}`, {
      headers: { 'Accept': 'application/x-protobuf' },
      next: { revalidate: 10 }
    });

    if (!res.ok) throw new Error(`TransLink API error: ${res.status}`);

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    const vehicles = feed.entity
      .filter((e) => e.vehicle && e.vehicle.position)
      .map((e) => {
        const vehicleData = e.vehicle;
        const trip = vehicleData?.trip;
        
        // Extract route info safely from trip or vehicle descriptor
        const rawRoute = trip?.routeId || vehicleData?.vehicle?.label || 'Bus';
        
        // Clean up internal TransLink route IDs if they come as long strings
        let routeNum = String(rawRoute).trim();
        if (routeNum.includes(':')) {
          const parts = routeNum.split(':');
          routeNum = parts[parts.length - 1];
        }

        return {
          id: vehicleData?.vehicle?.id || e.id || 'Unit',
          routeNumber: routeNum || 'Bus',
          lat: vehicleData?.position?.latitude || 0,
          lon: vehicleData?.position?.longitude || 0,
        };
      });

    return NextResponse.json({ success: true, count: vehicles.length, vehicles });
  } catch (error: any) {
    console.error('GTFS-RT fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to parse GTFS feed' }, { status: 500 });
  }
}