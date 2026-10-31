'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Bus, Train } from 'lucide-react';

// Coordinates defining line paths for animated SkyTrains
const EXPO_LINE = [
  [-123.1162, 49.2827], // Waterfront
  [-123.1040, 49.2770], // Stadium-Chinatown
  [-123.0990, 49.2630], // Commercial-Broadway
  [-123.0020, 49.2210], // Metrotown
  [-122.9120, 49.2040]  // New Westminster
];

const CANADA_LINE = [
  [-123.1162, 49.2827], // Waterfront
  [-123.1160, 49.2600], // City Hall
  [-123.1340, 49.1940], // Bridgeport
  [-123.1340, 49.1830]  // Brighouse
];

export default function TrafficMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [buses, setBuses] = useState<any[]>([]);
  const [showBuses, setShowBuses] = useState(true);
  const [showSkyTrain, setShowSkyTrain] = useState(true);

  const busMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const trainMarkersRef = useRef<maplibregl.Marker[]>([]);

  // 1. Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          },
          'skytrain-lines': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { line: 'Expo' },
                  geometry: { type: 'LineString', coordinates: EXPO_LINE }
                },
                {
                  type: 'Feature',
                  properties: { line: 'Canada' },
                  geometry: { type: 'LineString', coordinates: CANADA_LINE }
                }
              ]
            }
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          },
          {
            id: 'skytrain-layer',
            type: 'line',
            source: 'skytrain-lines',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#0284c7', 'line-width': 6, 'line-opacity': 0.9 }
          }
        ]
      },
      center: [-123.1207, 49.2827],
      zoom: 12
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  // 2. Fetch live bus positions periodically
  useEffect(() => {
    if (!showBuses) return;

    async function fetchBuses() {
      try {
        const res = await fetch('/api/translink/buses');
        const data = await res.json();
        if (Array.isArray(data)) {
          setBuses(data);
        }
      } catch (err) {
        console.error('Error fetching bus data:', err);
      }
    }

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000);
    return () => clearInterval(interval);
  }, [showBuses]);

  // 3. Update & Move Live Bus Markers
  useEffect(() => {
    if (!map.current) return;

    if (!showBuses) {
      Object.values(busMarkersRef.current).forEach((m) => m.remove());
      busMarkersRef.current = {};
      return;
    }

    buses.forEach((bus) => {
      const id = bus.VehicleNo || `${bus.Route}-${bus.Latitude}`;
      const lat = bus.Latitude;
      const lon = bus.Longitude;

      if (!lat || !lon) return;

      if (busMarkersRef.current[id]) {
        // Move existing marker smoothly
        busMarkersRef.current[id].setLngLat([lon, lat]);
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.style.backgroundColor = '#0d9488';
        el.style.color = 'white';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '14px';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        el.style.transition = 'all 1s ease-in-out';
        el.innerHTML = '🚌';

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
            <b>Route ${bus.Route}</b><br/>
            <span>Dest: ${bus.Destination}</span><br/>
            <small style="color: #64748b;">Vehicle #${bus.VehicleNo}</small>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current!);

        busMarkersRef.current[id] = marker;
      }
    });
  }, [buses, showBuses]);

  // 4. Animate Moving SkyTrain Trains along Line Coordinates
  useEffect(() => {
    if (!map.current) return;

    // Clean up existing train markers
    trainMarkersRef.current.forEach((m) => m.remove());
    trainMarkersRef.current = [];

    if (!showSkyTrain) return;

    // Create Train Icon Element
    const createTrainElement = () => {
      const el = document.createElement('div');
      el.style.backgroundColor = '#0284c7';
      el.style.color = 'white';
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '12px';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.4)';
      el.innerHTML = '🚆';
      return el;
    };

    const expoTrain = new maplibregl.Marker({ element: createTrainElement() })
      .setLngLat(EXPO_LINE[0] as [number, number])
      .addTo(map.current);

    const canadaTrain = new maplibregl.Marker({ element: createTrainElement() })
      .setLngLat(CANADA_LINE[0] as [number, number])
      .addTo(map.current);

    trainMarkersRef.current = [expoTrain, canadaTrain];

    // Interpolation state
    let step = 0;
    const maxSteps = 300;

    const animateTrains = () => {
      step = (step + 1) % maxSteps;
      const progress = step / maxSteps;

      // Calculate position along lines
      const expoIndex = Math.floor(progress * (EXPO_LINE.length - 1));
      const canadaIndex = Math.floor(progress * (CANADA_LINE.length - 1));

      if (expoTrain && EXPO_LINE[expoIndex]) {
        expoTrain.setLngLat(EXPO_LINE[expoIndex] as [number, number]);
      }
      if (canadaTrain && CANADA_LINE[canadaIndex]) {
        canadaTrain.setLngLat(CANADA_LINE[canadaIndex] as [number, number]);
      }
    };

    const interval = setInterval(animateTrains, 100);
    return () => clearInterval(interval);
  }, [showSkyTrain]);

  return (
    <div className="relative w-screen h-screen bg-slate-900">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Sidebar Control Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-xl text-white w-72">
        <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          Vancouver Traffic Intel
        </h1>
        <p className="text-xs text-slate-400 mb-4">Live Transit Movements</p>

        <div className="space-y-2">
          <button
            onClick={() => setShowSkyTrain(!showSkyTrain)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
              showSkyTrain ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Train size={16} /> SkyTrain Moving
            </span>
            <span className="text-xs">{showSkyTrain ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowBuses(!showBuses)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
              showBuses ? 'bg-teal-600/30 border-teal-500 text-teal-200' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bus size={16} /> Live Buses ({buses.length})
            </span>
            <span className="text-xs">{showBuses ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}