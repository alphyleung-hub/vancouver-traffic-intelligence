'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Train, Bus, Anchor, Key, Compass } from 'lucide-react';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl-csp-worker.js');
}

const NETWORK_ROUTES = {
  canada: {
    name: 'Canada Line (YVR / Brighouse)',
    color: '#06b6d4',
    stations: [
      [-123.1162, 49.2827],
      [-123.1145, 49.2740],
      [-123.1160, 49.2600],
      [-123.1250, 49.2430],
      [-123.1270, 49.2330],
      [-123.1280, 49.2260],
      [-123.1340, 49.1940],
      [-123.1380, 49.1830],
      [-123.1550, 49.1930],
      [-123.1815, 49.1950]
    ]
  },
  seabus: {
    name: 'SeaBus (Waterfront - Lonsdale)',
    color: '#10b981',
    stations: [
      [-123.1130, 49.2855],
      [-123.0805, 49.3115]
    ]
  },
  expo: {
    name: 'Expo Line',
    color: '#0284c7',
    stations: [
      [-123.1162, 49.2827],
      [-123.1040, 49.2770],
      [-123.0990, 49.2630],
      [-123.0690, 49.2620],
      [-123.0310, 49.2380],
      [-123.0020, 49.2210],
      [-122.9515, 49.2110],
      [-122.8460, 49.1900]
    ]
  },
  millennium: {
    name: 'Millennium Line',
    color: '#eab308',
    stations: [
      [-123.0250, 49.2650],
      [-123.0690, 49.2620],
      [-122.9690, 49.2670],
      [-122.8930, 49.2520],
      [-122.7910, 49.2750]
    ]
  }
};

function getBusGroupStyle(routeStr: string): { bg: string; label: string } {
  const route = routeStr.trim().toUpperCase();

  if (route.startsWith('R')) return { bg: '#ef4444', label: 'RapidBus' };
  if (route.startsWith('2')) return { bg: '#10b981', label: 'North Van' };
  if (route.startsWith('4')) return { bg: '#3b82f6', label: 'Richmond' };
  if (route.startsWith('9') || route.startsWith('N')) return { bg: '#8b5cf6', label: 'Express' };

  return { bg: '#f97316', label: 'Local' };
}

function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end;
}

export default function TrafficMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [statusMsg, setStatusMsg] = useState('Enter API key to sync');
  const [activeLines, setActiveLines] = useState({ canada: true, seabus: true, expo: true, millennium: true });
  const [showBuses, setShowBuses] = useState(true);

  const trainMarkersRef = useRef<maplibregl.Marker[]>([]);
  const busMarkersRef = useRef<maplibregl.Marker[]>([]);
  const animFrameId = useRef<number | null>(null);

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
          'network-source': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: Object.entries(NETWORK_ROUTES).map(([key, route]) => ({
                type: 'Feature',
                properties: { line: key, color: route.color },
                geometry: { type: 'LineString', coordinates: route.stations }
              }))
            }
          }
        },
        layers: [
          { id: 'osm-tiles-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 },
          {
            id: 'network-tracks',
            type: 'line',
            source: 'network-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 6,
              'line-opacity': 0.9
            }
          }
        ]
      },
      center: [-123.1000, 49.2600],
      zoom: 11
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  // Fetch Live Buses and Render Public Route Numbers + Colors
  useEffect(() => {
    if (!savedKey || !showBuses) {
      busMarkersRef.current.forEach(m => m.remove());
      busMarkersRef.current = [];
      return;
    }

    async function fetchBuses() {
      try {
        const res = await fetch(`/api/translink/positions?apikey=${savedKey}`, {
          headers: { 'x-translink-key': savedKey }
        });
        const data = await res.json();
        
        if (res.ok && data.success && map.current) {
          setStatusMsg(`Synced ${data.count} regional units`);

          busMarkersRef.current.forEach(m => m.remove());
          busMarkersRef.current = [];

          const newMarkers: maplibregl.Marker[] = [];
          data.vehicles.slice(0, 300).forEach((bus: any) => {
            if (!bus.lat || !bus.lon) return;

            const displayRoute = bus.routeNumber && bus.routeNumber !== 'Bus' ? bus.routeNumber : 'Bus';
            const groupStyle = getBusGroupStyle(displayRoute);

            const el = document.createElement('div');
            el.style.backgroundColor = groupStyle.bg;
            el.style.color = 'white';
            el.style.padding = '2px 6px';
            el.style.borderRadius = '12px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '3px';
            el.style.fontSize = '11px';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
            el.style.cursor = 'pointer';
            el.innerHTML = `🚌 <span>${displayRoute}</span>`;

            const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
              <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <div style="font-weight: bold; font-size: 12px; color: ${groupStyle.bg};">Route ${displayRoute} (${groupStyle.label})</div>
                <div style="font-size: 11px; margin-top: 2px;"><b>Vehicle ID:</b> ${bus.id}</div>
              </div>
            `);

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([bus.lon, bus.lat])
              .setPopup(popup)
              .addTo(map.current!);

            el.addEventListener('mouseenter', () => marker.togglePopup());
            el.addEventListener('mouseleave', () => marker.togglePopup());

            newMarkers.push(marker);
          });

          busMarkersRef.current = newMarkers;
        }
      } catch (err) {
        setStatusMsg('Failed to fetch regional feed');
      }
    }

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000);
    return () => clearInterval(interval);
  }, [savedKey, showBuses]);

  // Bi-Directional SkyTrain Animation Engine
  useEffect(() => {
    if (!map.current) return;

    trainMarkersRef.current.forEach((m) => m.remove());
    trainMarkersRef.current = [];

    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }

    const activeFleet: Array<{
      marker: maplibregl.Marker;
      stations: number[][];
      progress: number;
      speed: number;
      direction: string;
    }> = [];

    let unitCounter = 400;

    Object.entries(NETWORK_ROUTES).forEach(([key, route]) => {
      if (!activeLines[key as keyof typeof activeLines]) return;

      const lineConfigs = [
        { dir: 'Outbound', offset: 0.1, reverse: false },
        { dir: 'Outbound', offset: 0.6, reverse: false },
        { dir: 'Inbound', offset: 0.35, reverse: true },
        { dir: 'Inbound', offset: 0.85, reverse: true }
      ];

      lineConfigs.forEach((config) => {
        const unitId = `UNIT-${unitCounter++}`;
        const stationList = config.reverse ? [...route.stations].reverse() : route.stations;

        const el = document.createElement('div');
        el.style.backgroundColor = route.color;
        el.style.color = 'white';
        el.style.width = key === 'seabus' ? '30px' : '28px';
        el.style.height = key === 'seabus' ? '30px' : '28px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '12px';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.4)';
        el.style.cursor = 'pointer';
        el.innerHTML = key === 'seabus' ? '⛴️' : '🚆';

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
            <div style="font-weight: bold; font-size: 13px; color: ${route.color};">${route.name} (${config.dir})</div>
            <div style="font-size: 11px; margin-top: 2px;"><b>Unit ID:</b> ${unitId}</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(stationList[0] as [number, number])
          .setPopup(popup)
          .addTo(map.current!);

        el.addEventListener('mouseenter', () => marker.togglePopup());
        el.addEventListener('mouseleave', () => marker.togglePopup());

        activeFleet.push({
          marker,
          stations: stationList,
          progress: config.offset,
          speed: key === 'seabus' ? 0.00003 : 0.00006,
          direction: config.dir
        });

        trainMarkersRef.current.push(marker);
      });
    });

    if (activeFleet.length === 0) return;

    let lastTime = performance.now();

    const animateLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      activeFleet.forEach((item) => {
        item.progress = (item.progress + item.speed * (deltaTime * 60)) % 1;

        const totalSegments = item.stations.length - 1;
        const scaledProgress = item.progress * totalSegments;
        const segIndex = Math.floor(scaledProgress);
        const segAmt = scaledProgress - segIndex;

        const p1 = item.stations[segIndex];
        const p2 = item.stations[segIndex + 1] || item.stations[0];

        if (p1 && p2) {
          const currentLon = lerp(p1[0], p2[0], segAmt);
          const currentLat = lerp(p1[1], p2[1], segAmt);
          item.marker.setLngLat([currentLon, currentLat]);
        }
      });

      animFrameId.current = requestAnimationFrame(animateLoop);
    };

    animFrameId.current = requestAnimationFrame(animateLoop);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [activeLines]);

  return (
    <div className="relative w-screen h-screen bg-slate-900">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Control Sidebar */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-xl text-white w-80">
        <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <Compass size={20} className="text-cyan-400" /> Regional Fleet Intel
        </h1>
        <p className="text-xs text-slate-400 mb-4 font-mono">Categorized Route Network</p>

        {/* API Key Form */}
        <form onSubmit={(e) => { e.preventDefault(); setSavedKey(apiKey); }} className="mb-4">
          <label className="block text-[11px] text-slate-300 mb-1 font-medium">
            TransLink API Key
          </label>
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Key size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Paste API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Sync
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 font-mono">{statusMsg}</p>
        </form>

        {/* Live Buses Toggle & Color Legend */}
        <div className="mb-3 space-y-2">
          <button
            onClick={() => setShowBuses(!showBuses)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
              showBuses ? 'bg-orange-600/30 border-orange-500 text-orange-200' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bus size={16} /> Regional Buses
            </span>
            <span>{showBuses ? 'ON' : 'OFF'}</span>
          </button>

          {showBuses && (
            <div className="grid grid-cols-2 gap-1.5 text-[10px] p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-300 font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> RapidBus (R)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> North Van (2xx)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Richmond (4xx)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Express (9x/N)</span>
            </div>
          )}
        </div>

        {/* Rapid Transit Line Toggles */}
        <div className="space-y-2">
          {Object.entries(NETWORK_ROUTES).map(([key, route]) => (
            <button
              key={key}
              onClick={() => setActiveLines(prev => ({ ...prev, [key]: !prev[key as keyof typeof activeLines] }))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
                activeLines[key as keyof typeof activeLines]
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: route.color }} />
                {key === 'seabus' ? <Anchor size={14} /> : <Train size={14} />} {route.name}
              </span>
              <span>{activeLines[key as keyof typeof activeLines] ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}