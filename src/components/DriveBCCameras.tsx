'use client';

import { useState } from 'react';
import { Camera, ExternalLink, Video } from 'lucide-react';

const LOWER_MAINLAND_CAMS = [
  {
    id: 'alex-fraser',
    name: 'Alex Fraser Bridge (Hwy 91)',
    location: 'North & South View',
    pageUrl: 'https://www.drivebc.ca/cameras/135'
  },
  {
    id: 'massey-tunnel',
    name: 'George Massey Tunnel (Hwy 99)',
    location: 'North Portal',
    pageUrl: 'https://www.drivebc.ca/cameras/34'
  },
  {
    id: 'ironworkers',
    name: 'Ironworkers Memorial Bridge',
    location: 'South Approach',
    pageUrl: 'https://www.drivebc.ca/cameras/142'
  },
  {
    id: 'port-mann',
    name: 'Port Mann Bridge (Hwy 1)',
    location: 'Mid-Span View',
    pageUrl: 'https://www.drivebc.ca/cameras/955'
  }
];

export default function DriveBCCameras() {
  const [selectedCam, setSelectedCam] = useState(LOWER_MAINLAND_CAMS[0]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
      <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Video size={14} className="text-teal-400" /> DriveBC Bridge Cams
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
          Live Portal
        </span>
      </div>

      <select
        value={selectedCam.id}
        onChange={(e) => {
          const found = LOWER_MAINLAND_CAMS.find((c) => c.id === e.target.value);
          if (found) setSelectedCam(found);
        }}
        aria-label="Select bridge camera feed"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs mb-3 focus:outline-none focus:border-teal-500"
      >
        {LOWER_MAINLAND_CAMS.map((cam) => (
          <option key={cam.id} value={cam.id}>
            {cam.name}
          </option>
        ))}
      </select>

      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-4 text-center">
        <Camera size={28} className="mx-auto mb-2 text-teal-400 opacity-80" />
        <p className="text-slate-200 font-medium mb-1">{selectedCam.name}</p>
        <p className="text-[11px] text-slate-400 mb-3">{selectedCam.location}</p>

        <a
          href={selectedCam.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Open Live DriveBC Feed <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}