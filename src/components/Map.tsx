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

  // 1. Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-123.1207, 49.2827], // Vancouver Center
      zoom: 11
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Add SkyTrain Lines GeoJSON source
      map.current?.addSource('skytrain-lines', {
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

      // Add SkyTrain visual layer
      map.current?.addLayer({
        id: 'skytrain-layer',
        type: 'line',
        source: 'skytrain-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#06b6d4',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    });
  }, []);

  // 2. Fetch live buses periodically
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