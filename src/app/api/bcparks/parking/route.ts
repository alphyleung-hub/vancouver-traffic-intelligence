import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch full dataset of protected areas from Strapi endpoint
    const res = await fetch('https://bcparks.api.gov.bc.ca/api/protected-areas?pagination[pageSize]=500&populate=*', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    });

    const parsedFromApi: any[] = [];

    if (res.ok) {
      const json = await res.json();
      const parks = json.data || [];

      parks.forEach((park: any) => {
        const attr = park.attributes || park;
        const parkName = attr.protectedAreaName || attr.name || '';
        const lat = Number(attr.latitude || attr.lat || attr.geometry?.coordinates?.[1] || 0);
        const lon = Number(attr.longitude || attr.lon || attr.geometry?.coordinates?.[0] || 0);

        if (lat !== 0 && lon !== 0) {
          parsedFromApi.push({
            id: `api-${park.id || parkName}`,
            name: `${parkName} - Parking`,
            description: 'Provincial Park Parking & Day Use Facility',
            lat,
            lon
          });
        }
      });
    }

    // Comprehensive list of regional and provincial park parking locations across Metro Vancouver
    const metroVancouverParkParking = [
      // North Shore & Sea to Sky
      { id: 'pk-cypress-main', name: 'Cypress Provincial Park - Main Parking', description: 'Parking lot for Hollyburn & Nordic trails', lat: 49.3456, lon: -123.2035 },
      { id: 'pk-cypress-downhill', name: 'Cypress Mountain Downhill Parking', description: 'Ski area & hiking trailhead parking', lat: 49.3958, lon: -123.2044 },
      { id: 'pk-seymour-lot1', name: 'Mount Seymour Park - Parking Lot 1', description: 'Lower lot for Mystery Lake & trailheads', lat: 49.3668, lon: -122.9482 },
      { id: 'pk-seymour-top', name: 'Mount Seymour Park - Main Resort Parking', description: 'Upper lot for Mt Seymour trail network', lat: 49.3921, lon: -122.9475 },
      { id: 'pk-capilano-river', name: 'Capilano River Regional Park Parking', description: 'Cleveland Dam & Salmon Hatchery access', lat: 49.3581, lon: -123.1112 },
      { id: 'pk-lynn-headwaters', name: 'Lynn Headwaters Regional Park Parking', description: 'Varley Trail & Lynn Loop trailhead lot', lat: 49.3601, lon: -123.0189 },
      { id: 'pk-lynn-canyon', name: 'Lynn Canyon Park Parking', description: 'Suspension bridge & Eco Centre parking', lat: 49.3431, lon: -123.0185 },
      { id: 'pk-deep-cove', name: 'Deep Cove Panorama Park Parking', description: 'Quarry Rock trailhead & kayaking parking', lat: 49.3275, lon: -122.9492 },
      { id: 'pk-grouse-grind', name: 'Grouse Mountain Base Parking', description: 'Grouse Grind & Skyride base parking', lat: 49.3712, lon: -123.0991 },
      { id: 'pk-whytecliff', name: 'Whytecliff Park Parking', description: 'Day-use beach & marine park lot', lat: 49.3725, lon: -123.2911 },
      { id: 'pk-lighthouse', name: 'Lighthouse Park Parking', description: 'Beacon Lane parking facility', lat: 49.3361, lon: -123.2568 },
      { id: 'pk-porteau-cove', name: 'Porteau Cove Provincial Park Lot', description: 'Waterfront day-use & boat launch lot', lat: 49.5583, lon: -123.2356 },
      { id: 'pk-murrin', name: 'Murrin Provincial Park Parking', description: 'Browning Lake & rock climbing parking', lat: 49.6482, lon: -123.2065 },
      { id: 'pk-shannon-falls', name: 'Shannon Falls Provincial Park Parking', description: 'Day-use falls trailhead parking', lat: 49.6698, lon: -123.1565 },
      { id: 'pk-alice-lake', name: 'Alice Lake Provincial Park Day Use', description: 'Four Lakes Trailhead & beach parking', lat: 49.7797, lon: -123.1311 },

      // Vancouver & Burnaby
      { id: 'pk-stanley-totem', name: 'Stanley Park - Brockton Point Lot', description: 'Totem poles & Seawall parking lot', lat: 49.2995, lon: -123.1165 },
      { id: 'pk-stanley-third', name: 'Stanley Park - Third Beach Parking', description: 'Ferguson Point & Third Beach lot', lat: 49.3022, lon: -123.1562 },
      { id: 'pk-stanley-hollow', name: 'Stanley Park - Hollow Tree Parking', description: 'Elephant Tree & trail access parking', lat: 49.3075, lon: -123.1491 },
      { id: 'pk-pacific-spirit-west', name: 'Pacific Spirit Park - 16th Ave Lot', description: 'Imperial Trailhead parking', lat: 49.2561, lon: -123.2205 },
      { id: 'pk-pacific-spirit-south', name: 'Pacific Spirit Park - 41st Ave Lot', description: 'South trail network parking', lat: 49.2341, lon: -123.2132 },
      { id: 'pk-jericho', name: 'Jericho Beach Park Main Lot', description: 'Sailing centre & beach parking', lat: 49.2731, lon: -123.1955 },
      { id: 'pk-spanish-banks', name: 'Spanish Banks Beach West Parking', description: 'Oceanfront day-use parking', lat: 49.2768, lon: -123.2195 },
      { id: 'pk-queen-elizabeth', name: 'Queen Elizabeth Park Main Lot', description: 'Bloedel Conservatory & Quarry Gardens parking', lat: 49.2418, lon: -123.1126 },
      { id: 'pk-central-park', name: 'Central Park Burnaby Parking', description: 'Swangard Stadium & trail access lot', lat: 49.2295, lon: -123.0182 },
      { id: 'pk-deer-lake', name: 'Deer Lake Park Shadbolt Lot', description: 'Art centre & lake trail parking', lat: 49.2378, lon: -122.9732 },
      { id: 'pk-burnaby-lake', name: 'Burnaby Lake Regional Park Lot', description: 'Nature house & rowing pavilion parking', lat: 49.2492, lon: -122.9465 },
      { id: 'pk-burnaby-mountain', name: 'Burnaby Mountain Horizon Park Lot', description: 'Kamui Mintara totems & lookout lot', lat: 49.2821, lon: -122.9515 },

      // Richmond, Delta & Surrey
      { id: 'pk-terra-nova', name: 'Terra Nova Rural Park Parking', description: 'Dike trail & adventure park lot', lat: 49.1772, lon: -123.1925 },
      { id: 'pk-garry-point', name: 'Garry Point Park Main Lot', description: 'Steveston waterfront & dike parking', lat: 49.1245, lon: -123.1935 },
      { id: 'pk-icbc-dike', name: 'Iona Beach Regional Park Lot', description: 'Iona Jetty & bird sanctuary parking', lat: 49.2198, lon: -123.2105 },
      { id: 'pk-macdonal-beach', name: 'MacDonald Beach Park Parking', description: 'Fraser River boat launch & dog park lot', lat: 49.2085, lon: -123.1672 },
      { id: 'pk-deas-island', name: 'Deas Island Regional Park Lot', description: 'Fraser River trail & picnic parking', lat: 49.1265, lon: -123.0562 },
      { id: 'pk-boundary-bay', name: 'Boundary Bay Regional Park Lot', description: 'Centennial Beach & trail parking', lat: 49.0112, lon: -123.0415 },
      { id: 'pk-tynehead', name: 'Tynehead Regional Park Parking', description: 'Hatchery & perimeter trail lot', lat: 49.1865, lon: -122.7562 },
      { id: 'pk-surrey-lake', name: 'Surrey Lake Park Parking', description: 'Nature reserve trail parking', lat: 49.1385, lon: -122.8021 },
      { id: 'pk-creskelly', name: 'Crescent Beach Blackie Spit Lot', description: 'Oceanfront & spit trail parking', lat: 49.0562, lon: -122.8812 },

      // Tri-Cities & Ridge Meadows
      { id: 'pk-belcarra', name: 'Belcarra Regional Park Picnic Lot', description: 'Sasamat Lake & ocean day-use parking', lat: 49.3211, lon: -122.9295 },
      { id: 'pk-sasamat-lake', name: 'Sasamat Lake White Pine Beach Lot', description: 'Swimming beach & lake loop parking', lat: 49.3238, lon: -122.8942 },
      { id: 'pk-minnekhada', name: 'Minnekhada Regional Park Quarry Lot', description: 'High Knoll trailhead parking', lat: 49.2782, lon: -122.6845 },
      { id: 'pk-colony-farm', name: 'Colony Farm Regional Park Lot', description: 'Coquitlam River trail parking', lat: 49.2435, lon: -122.7832 },
      { id: 'pk-golden-ears-alouette', name: 'Golden Ears Park - Alouette South Lot', description: 'Main day-use & boat launch parking', lat: 49.2974, lon: -122.4862 },
      { id: 'pk-golden-ears-goldcreek', name: 'Golden Ears Park - Gold Creek Lot', description: 'Lower Falls & Canyon Trail parking', lat: 49.3142, lon: -122.4645 },
      { id: 'pk-kanaka-creek', name: 'Kanaka Creek Regional Park Lot', description: 'Cliff Falls & hatchery parking', lat: 49.2155, lon: -122.5412 }
    ];

    const allParking = [...metroVancouverParkParking, ...parsedFromApi];

    return NextResponse.json({ success: true, count: allParking.length, parking: allParking });
  } catch (error: any) {
    console.error('BC Parks fetch error:', error.message);
    return NextResponse.json({ success: false, count: 0, parking: [] });
  }
}