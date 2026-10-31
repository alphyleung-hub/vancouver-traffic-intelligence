'use client';

import { useState } from 'react';
import { Camera, ExternalLink, Video } from 'lucide-react';

// Key Lower Mainland bridge & highway traffic cameras from DriveBC
const LOWER_MAINLAND_CAMS = [
  {
    id: 'alex-fraser',
    name: 'Alex Fraser Bridge (Hwy 91)',
    location: 'North & South View',
    imageUrl: 'https://images.drivebc.ca/bchighwaycam/pub/cameras/135.jpg',
    pageUrl: 'https://www.drivebc.ca/cameras/135'
  },
  {
    id: 'massey-tunnel',
    name: 'George Massey Tunnel (Hwy 99)',
    location: 'North Portal',
    imageUrl: 'https://images.drivebc.ca/bchighwaycam/pub/cameras/34.jpg',
    pageUrl: 'https://www.drivebc.ca/cameras/34'
  },
  {
    id: 'ironworkers',
    name: 'Ironworkers Memorial Bridge',
    location: 'South Approach',
    imageUrl: 'https://images.drivebc.ca/bchighwaycam/pub/cameras/142.jpg',
    pageUrl: 'https://www.drivebc.ca/cameras/142'
  },
  {
    id: 'port-mann',
    name: 'Port Mann Bridge (Hwy 1)',
    location: 'Mid-Span View',
    imageUrl: 'https://images.drivebc.ca/bchighwaycam/pub/cameras/955.jpg',
    pageUrl: 'https://www.drivebc.ca/cameras/955'
  }
];

export default function DriveBCCameras() {
  const [selectedCam, setSelectedCam] = useState(LOWER_MAINLAND_CAMS[0]);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
      <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Video size={14} className="text-teal-400" /> DriveBC Bridge Cams
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
          Live Feed
        </span>
      </div>

      {/* Camera Selector Dropdown */}
      <select
        value={selectedCam.id}
        onChange={(e) => {
          const found = LOWER_MAINLAND_CAMS.find((c) => c.id === e.target.value);
          if (found) {
            setSelectedCam(found);
            setImgError(false);
          }
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

      {/* Camera Preview Box */}
      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
        {!imgError ? (
          <img
            src={selectedCam.imageUrl}
            alt={selectedCam.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-4 text-slate-400">
            <Camera size={24} className="mx-auto mb-1 opacity-50" />
            <span>Feed updating / maintenance</span>
          </div>
        )}

        {/* Overlay Label */}
        <div className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-200 flex items-center justify-between">
          <span className="truncate">{selectedCam.location}</span>
          <a
            href={selectedCam.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400 hover:underline flex items-center gap-0.5 shrink-0 ml-2"
          >
            DriveBC <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}