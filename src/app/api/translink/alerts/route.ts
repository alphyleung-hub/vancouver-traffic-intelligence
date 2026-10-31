import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.TRANSLINK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'TransLink API key missing' }, { status: 500 });
  }

  try {
    // Request JSON format explicitly from TransLink GTFS-RT endpoint
    const response = await fetch(`https://gtfsapi.translink.ca/v3/gtfsalerts?apikey=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 30 }
    });

    if (!response.ok) {
      throw new Error(`TransLink API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse GTFS-RT alert entities safely
    const entities = data.entity || [];
    const alerts = entities
      .filter((entity: any) => entity.alert)
      .map((entity: any) => {
        const alert = entity.alert;
        const headerText = alert.headerText?.translation?.[0]?.text || 'SkyTrain Service Update';
        const descText = alert.descriptionText?.translation?.[0]?.text || '';
        
        return {
          id: entity.id || Math.random().toString(),
          header: headerText,
          description: descText,
        };
      });

    return NextResponse.json(alerts, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60'
      }
    });

  } catch (error: any) {
    console.error('Error fetching live TransLink alerts:', error.message);
    
    // Return graceful status if feed encounters a temporary block
    return NextResponse.json([
      { 
        id: 'fallback-1', 
        header: 'Expo & Canada Line Status', 
        description: 'Check official TransLink advisory page for active alerts.' 
      }
    ]);
  }
}