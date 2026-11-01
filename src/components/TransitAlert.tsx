'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Key } from 'lucide-react';

export default function TransitAlerts() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('translink_api_key');
    if (stored) {
      setApiKey(stored);
      setSavedKey(stored);
    }
  }, []);

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      try {
        const headers: HeadersInit = {};
        if (savedKey) headers['x-translink-key'] = savedKey;

        const res = await fetch(`/api/translink/alerts?apikey=${savedKey}`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      } catch (err) {
        console.error('Failed to load alerts', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [savedKey]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('translink_api_key', apiKey);
    setSavedKey(apiKey);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
      <div className="font-semibold text-slate-300 mb-2 flex items-center justify-between">
        <span>SkyTrain Network Status</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 size={12} /> Live
        </span>
      </div>

      {/* Manual API Key Input Form */}
      <form onSubmit={handleSaveKey} className="mb-3">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Key size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter TransLink API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-slate-400 italic">Checking TransLink feed...</p>
      ) : alerts.length === 0 ? (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>All lines operating normally</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
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
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
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