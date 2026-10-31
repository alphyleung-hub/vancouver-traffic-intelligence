'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Bus, Train } from 'lucide-react';

export default function TrafficMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [buses, setBuses] = useState<any[]>([]);
  const [showBuses, setShowBuses] = useState(true);
  const [showSkyTrain, setShowSkyTrain] = useState(true);

  // 1. Initialize Map with OpenStreetMap Raster Base Tiles
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
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [-123.1207, 49.2827], // Vancouver Center
      zoom: 11
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add SkyTrain Lines GeoJSON source safely after load
      if (!map.current.getSource('skytrain-lines')) {
        map.current.addSource('skytrain-lines', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { line: 'Expo' },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-123.1162, 49.2827], // Waterfront
                    [-123.1040, 49.2770], // Stadium-Chinatown
                    [-123.0990, 49.2630], // Commercial-Broadway
                    [-123.0020, 49.2210], // Metrotown
                    [-122.9120, 49.2040]  // New Westminster / Surrey
                  ]
                }
              },
              {
                type: 'Feature',
                properties: { line: 'Canada' },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-123.1162, 49.2827], // Waterfront
                    [-123.1160, 49.2600], // City Hall
                    [-123.1340, 49.1940], // Bridgeport
                    [-123.1340, 49.1830]  // YVR Airport / Brighouse
                  ]
                }
              }
            ]
          }
        });
      }

      // Add thick visual line layer for SkyTrain
      if (!map.current.getLayer('skytrain-layer')) {
        map.current.addLayer({
          id: 'skytrain-layer',
          type: 'line',
          source: 'skytrain-lines',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#0284c7', // Bright Sky Blue
            'line-width': 8,          // High visibility thickness
            'line-opacity': 0.95
          }
        });
      }
    });
  }, []);

  // 2. Control SkyTrain layer visibility
  useEffect(() => {
    if (!map.current) return;
    if (map.current.getLayer('skytrain-layer')) {
      map.current.setLayoutProperty(
        'skytrain-layer',
        'visibility',
        showSkyTrain ? 'visible' : 'none'
      );
    }
  }, [showSkyTrain]);

  // 3. Poll live buses
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
        console.error('Error loading live buses:', err);
      }
    }

    fetchBuses();
    const interval = setInterval(fetchBuses, 15000);
    return () => clearInterval(interval);
  }, [showBuses]);

  // 4. Render bus markers with explicit inline styles & popups
  useEffect(() => {
    if (!map.current || !showBuses) return;

    const markers: maplibregl.Marker[] = [];

    buses.forEach((bus) => {
      const lat = bus.Latitude;
      const lon = bus.Longitude;
      if (!lat || !lon) return;

      const el = document.createElement('div');
      el.className = 'marker-bus';
      el.style.backgroundColor = '#0d9488';
      el.style.color = 'white';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '14px';
      el.style.fontWeight = 'bold';
      el.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.innerHTML = '🚌';

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="color: #0f172a; font-family: sans-serif; padding: 6px;">
          <div style="font-weight: bold; font-size: 14px; color: #0d9488;">
            Route ${bus.Route}
          </div>
          <div style="font-size: 12px; margin-top: 2px;">
            <b>Destination:</b> ${bus.Destination}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Vehicle No: ${bus.VehicleNo}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [buses, showBuses]);

  return (
    <div className="relative w-screen h-screen bg-slate-900">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Control Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-xl text-white w-72">
        <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          Vancouver Traffic Intel
        </h1>
        <p className="text-xs text-slate-400 mb-4">TransLink & DriveBC Live Feed</p>

        <div className="space-y-2">
          <button
            onClick={() => setShowSkyTrain(!showSkyTrain)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
              showSkyTrain ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Train size={16} /> SkyTrain Lines
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