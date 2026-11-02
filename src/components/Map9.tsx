'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Train, Bus, AlertTriangle, Anchor, Compass, Filter } from 'lucide-react';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl-csp-worker.js');
}

const NETWORK_ROUTES = {
  canada: {
    name: 'Canada Line (YVR / Brighouse)',
    color: '#06b6d4',
    stations: [
      [-123.1162, 49.2827], [-123.1145, 49.2740], [-123.1160, 49.2600],
      [-123.1250, 49.2430], [-123.1270, 49.2330], [-123.1280, 49.2260],
      [-123.1340, 49.1940], [-123.1380, 49.1830], [-123.1550, 49.1930], [-123.1815, 49.1950]
    ]
  },
  seabus: {
    name: 'SeaBus (Waterfront - Lonsdale)',
    color: '#10b981',
    stations: [[-123.1130, 49.2855], [-123.0805, 49.3115]]
  },
  expo: {
    name: 'Expo Line',
    color: '#0284c7',
    stations: [
      [-123.1162, 49.2827], [-123.1040, 49.2770], [-123.0990, 49.2630],
      [-123.0690, 49.2620], [-123.0310, 49.2380], [-123.0020, 49.2210],
      [-122.9515, 49.2110], [-122.8460, 49.1900]
    ]
  },
  millennium: {
    name: 'Millennium Line',
    color: '#eab308',
    stations: [
      [-123.0250, 49.2650], [-123.0690, 49.2620], [-122.9690, 49.2670],
      [-122.8930, 49.2520], [-122.7910, 49.2750]
    ]
  }
};

function getBusGroupStyle(routeStr: string): { bg: string; label: string } {
  const route = routeStr.trim().toUpperCase();
  if (route.startsWith('R')) return { bg: '#ef4444', label: 'RapidBus' };
  if (route === '10') return { bg: '#2563eb', label: 'Route 10' };
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

  const [statusMsg, setStatusMsg] = useState('Syncing regional data...');
  const [activeLines, setActiveLines] = useState({ canada: true, seabus: true, expo: true, millennium: true });
  const [showBuses, setShowBuses] = useState(true);
  const [showDriveBC, setShowDriveBC] = useState(true);
  const [routeFilter, setRouteFilter] = useState('');

  const trainMarkersRef = useRef<maplibregl.Marker[]>([]);
  const busMarkersRef = useRef<maplibregl.Marker[]>([]);
  const driveBCMarkersRef = useRef<maplibregl.Marker[]>([]);
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
            paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 0.9 }
          }
        ]
      },
      center: [-123.1000, 49.2600],
      zoom: 11
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  // Fetch Live Buses
  useEffect(() => {
    if (!showBuses) {
      busMarkersRef.current.forEach(m => m.remove());
      busMarkersRef.current = [];
      return;
    }

    async function fetchBuses() {
      try {
        const res = await fetch('/api/translink/positions');
        const data = await res.json();
        
        if (res.ok && data.success && map.current) {
          busMarkersRef.current.forEach(m => m.remove());
          busMarkersRef.current = [];

          let vehicles = data.vehicles;
          if (routeFilter.trim() !== '') {
            vehicles = vehicles.filter((v: any) => 
              v.routeNumber.toLowerCase().includes(routeFilter.trim().toLowerCase())
            );
          }

          setStatusMsg(`Synced ${data.count} units`);

          const newMarkers: maplibregl.Marker[] = [];
          vehicles.slice(0, 300).forEach((bus: any) => {
            if (!bus.lat || !bus.lon) return;

            const displayRoute = bus.routeNumber && bus.routeNumber !== 'Bus' ? bus.routeNumber : 'Bus';
            const groupStyle = getBusGroupStyle(displayRoute);

            const el = document.createElement('div');
            el.style.backgroundColor = displayRoute === '10' ? '#2563eb' : groupStyle.bg;
            el.style.color = 'white';
            el.style.padding = '3px 8px';
            el.style.borderRadius = '14px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '4px';
            el.style.fontSize = '12px';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
            el.style.cursor = 'pointer';
            el.innerHTML = `🚌 <span>${displayRoute}</span>`;

            const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
              <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <div style="font-weight: bold; font-size: 13px; color: ${groupStyle.bg};">Route ${displayRoute} (${groupStyle.label})</div>
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
        setStatusMsg('Failed to fetch bus feed');
      }
    }

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000);
    return () => clearInterval(interval);
  }, [showBuses, routeFilter]);

  // Fetch DriveBC Highway Events
  useEffect(() => {
    if (!showDriveBC) {
      driveBCMarkersRef.current.forEach(m => m.remove());
      driveBCMarkersRef.current = [];
      return;
    }

    async function fetchDriveBC() {
      try {
        const res = await fetch('/api/drivebc/events');
        const data = await res.json();

        if (res.ok && data.success && map.current) {
          driveBCMarkersRef.current.forEach(m => m.remove());
          driveBCMarkersRef.current = [];

          const newMarkers: maplibregl.Marker[] = [];
          data.events.forEach((ev: any) => {
            if (!ev.lat || !ev.lon) return;

            const el = document.createElement('div');
            el.style.backgroundColor = ev.severity === 'MAJOR' ? '#dc2626' : '#f59e0b';
            el.style.color = 'white';
            el.style.width = '26px';
            el.style.height = '26px';
            el.style.borderRadius = '50%';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '12px';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
            el.style.cursor = 'pointer';
            el.innerHTML = '⚠️';

            const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
              <div style="color: #0f172a; font-family: sans-serif; padding: 4px; max-width: 200px;">
                <div style="font-weight: bold; font-size: 12px; color: #dc2626;">DriveBC: ${ev.eventType}</div>
                <div style="font-size: 11px; margin-top: 2px; font-weight: bold;">${ev.headline}</div>
                <div style="font-size: 10px; color: #475569; margin-top: 2px;">${ev.description.substring(0, 80)}...</div>
              </div>
            `);

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([ev.lon, ev.lat])
              .setPopup(popup)
              .addTo(map.current!);

            el.addEventListener('mouseenter', () => marker.togglePopup());
            el.addEventListener('mouseleave', () => marker.togglePopup());

            newMarkers.push(marker);
          });

          driveBCMarkersRef.current = newMarkers;
        }
      } catch (err) {
        console.error('Failed to fetch DriveBC data');
      }
    }

    fetchDriveBC();
    const interval = setInterval(fetchDriveBC, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [showDriveBC]);

  // Train animation effect...
  useEffect(() => {
    if (!map.current) return;
    trainMarkersRef.current.forEach((m) => m.remove());
    trainMarkersRef.current = [];
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

    const activeFleet: Array<{ marker: maplibregl.Marker; stations: number[][]; progress: number; speed: number; direction: string }> = [];
    let unitCounter = 400;

    Object.entries(NETWORK_ROUTES).forEach(([key, route]) => {
      if (!activeLines[key as keyof typeof activeLines]) return;
      const lineConfigs = [
        { dir: 'Outbound', offset: 0.1, reverse: false },
        { dir: 'Inbound', offset: 0.35, reverse: true }
      ];

      lineConfigs.forEach((config) => {
        const unitId = `UNIT-${unitCounter++}`;
        const stationList = config.reverse ? [...route.stations].reverse() : route.stations;
        const el = document.createElement('div');
        el.style.backgroundColor = route.color;
        el.style.color = 'white';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '12px';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.4)';
        el.innerHTML = key === 'seabus' ? '⛴️' : '🚆';

        const marker = new maplibregl.Marker({ element: el }).setLngLat(stationList[0] as [number, number]).addTo(map.current!);
        activeFleet.push({ marker, stations: stationList, progress: config.offset, speed: 0.00005, direction: config.dir });
        trainMarkersRef.current.push(marker);
      });
    });

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
          item.marker.setLngLat([lerp(p1[0], p2[0], segAmt), lerp(p1[1], p2[1], segAmt)]);
        }
      });
      animFrameId.current = requestAnimationFrame(animateLoop);
    };
    animFrameId.current = requestAnimationFrame(animateLoop);
    return () => { if (animFrameId.current) cancelAnimationFrame(animFrameId.current); };
  }, [activeLines]);

  return (
    <div className="relative w-screen h-screen bg-slate-900">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Control Sidebar */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-xl text-white w-80">
        <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <Compass size={20} className="text-cyan-400" /> Regional Fleet & Traffic
        </h1>
        <p className="text-xs text-slate-400 mb-3 font-mono">TransLink & DriveBC Integration</p>
        <p className="text-[10px] text-cyan-400 mb-3 font-mono">{statusMsg}</p>

        {/* Route Filter Search Box */}
        <div className="mb-3">
          <label className="block text-[11px] text-slate-300 mb-1 font-medium flex items-center gap-1">
            <Filter size={12} /> Filter Route (e.g. 10, R4)
          </label>
          <input
            type="text"
            placeholder="Type route number..."
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Toggles */}
        <div className="mb-3 space-y-2">
          <button
            onClick={() => setShowBuses(!showBuses)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
              showBuses ? 'bg-orange-600/30 border-orange-500 text-orange-200' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2"><Bus size={16} /> Regional Buses</span>
            <span>{showBuses ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowDriveBC(!showDriveBC)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
              showDriveBC ? 'bg-red-600/30 border-red-500 text-red-200' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2"><AlertTriangle size={16} /> DriveBC Highway Alerts</span>
            <span>{showDriveBC ? 'ON' : 'OFF'}</span>
          </button>
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