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
    const response = await fetch(`https://gtfsapi.translink.ca/v3/gtfsalerts?apikey=${apiKey}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 }
    });

    if (!response.ok) {
      throw new Error(`TransLink API error: ${response.status}`);
    }

    const data = await response.json();
    const entities = data.entity || [];
    const alerts = entities
      .filter((entity: any) => entity.alert)
      .map((entity: any) => {
        const alert = entity.alert;
        return {
          id: entity.id || Math.random().toString(),
          header: alert.headerText?.translation?.[0]?.text || 'SkyTrain Service Update',
          description: alert.descriptionText?.translation?.[0]?.text || '',
        };
      });

    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error('Error fetching live TransLink alerts:', error.message);
    return NextResponse.json([
      { id: 'fallback-1', header: 'Expo & Canada Line Status', description: 'Normal service or check TransLink portal.' }
    ]);
  }
}