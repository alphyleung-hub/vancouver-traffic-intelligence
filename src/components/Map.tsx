'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Bus, Train } from 'lucide-react';
import TransitAlerts from './TransitAlerts';
import DriveBCCameras from './DriveBCCameras';

// Coordinates defining track paths for animated SkyTrains
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

  // 1. Initialize Map with OpenStreetMap Raster Tiles & SkyTrain GeoJSON Source
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
            paint: { 'line-color': '#0284c7', 'line-width': 7, 'line-opacity': 0.95 }
          }
        ]
      },
      center: [-123.1207, 49.2827], // Vancouver Center
      zoom: 11
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  // 2. Toggle SkyTrain Layer Visibility Instantly
  useEffect(() => {
    if (!map.current || !map.current.getLayer('skytrain-layer')) return;
    map.current.setLayoutProperty(
      'skytrain-layer',
      'visibility',
      showSkyTrain ? 'visible' : 'none'
    );
  }, [showSkyTrain]);

  // 3. Fetch Live Bus Positions Periodically
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
        console.error('Error fetching live bus data:', err);
      }
    }

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000);
    return () => clearInterval(interval);
  }, [showBuses]);

  // 4. Update & Smoothly Interpolate Live Bus Markers
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
        // Smoothly glide existing marker to new lat/lon coordinate via CSS transition
        busMarkersRef.current[id].setLngLat([lon, lat]);
      } else {
        // Create new marker DOM element
        const el = document.createElement('div');
        el.style.backgroundColor = '#0d9488';
        el.style.color = 'white';
        el.style.width = '34px';
        el.style.height = '34px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '16px';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
        el.style.transition = 'all 1s ease-in-out'; // Enables fluid animation
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

        busMarkersRef.current[id] = marker;
      }
    });
  }, [buses, showBuses]);

  // 5. Animate Moving SkyTrain Markers along Track Geometries
  useEffect(() => {
    if (!map.current) return;

    trainMarkersRef.current.forEach((m) => m.remove());
    trainMarkersRef.current = [];

    if (!showSkyTrain) return;

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
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
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

    let step = 0;
    const maxSteps = 300;

    const animateTrains = () => {
      step = (step + 1) % maxSteps;
      const progress = step / maxSteps;

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

      {/* Control Overlay Sidebar */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-xl text-white w-80 max-h-[92vh] overflow-y-auto">
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

        {/* Live Service Alerts Panel */}
        <TransitAlerts />

        {/* DriveBC Bridge Cameras Widget */}
        <DriveBCCameras />
      </div>
    </div>
  );
}