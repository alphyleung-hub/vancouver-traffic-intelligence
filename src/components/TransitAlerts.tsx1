'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TransitAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/translink/alerts');
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      } catch (err) {
        console.error('Failed to load live transit alerts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Poll alerts every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
      <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
        <span>SkyTrain Network Status</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 size={12} /> Live
        </span>
      </div>

      {loading ? (
        <p className="text-slate-400 italic">Checking TransLink feed...</p>
      ) : alerts.length === 0 ? (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>All lines operating normally</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200"
            >
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle size={14} className="shrink-0" />
                <span className="truncate">{alert.header}</span>
              </div>
              {alert.description && (
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}