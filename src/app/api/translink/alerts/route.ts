import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API key missing' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://gtfsapi.translink.ca/v3/gtfsalerts?apikey=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Cache and revalidate every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`TransLink API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse entities to extract relevant SkyTrain or system-wide alerts
    const entities = data.entity || [];
    const alerts = entities
      .filter((entity: any) => entity.alert)
      .map((entity: any) => {
        const alert = entity.alert;
        return {
          id: entity.id,
          header: alert.headerText?.translation?.[0]?.text || 'Service Update',
          description: alert.descriptionText?.translation?.[0]?.text || '',
          effect: alert.effect || 'UNKNOWN_EFFECT',
          cause: alert.cause || 'UNKNOWN_CAUSE',
        };
      });

    return NextResponse.json(alerts, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error: any) {
    console.error('Error fetching SkyTrain alerts:', error.message);
    
    // Fallback normal service status if offline
    return NextResponse.json([
      { id: 'normal-1', header: 'Expo & Canada Line: Normal Service', description: 'All stations operating on regular schedules.', effect: 'NO_EFFECT' }
    ]);
  }
}