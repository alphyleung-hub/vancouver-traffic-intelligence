'use client';

import dynamic from 'next/dynamic';

const TrafficMap = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-lg font-medium animate-pulse">Loading Vancouver Traffic Map...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950">
      <TrafficMap />
    </main>
  );
}