import { useMemo, useState } from "react";
import { getUsageLog } from "../lib/store.js";

export default function UsagePanel() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const stats = useMemo(() => {
    const log = getUsageLog();
    const apiCalls = log.filter((e) => !e.cached);
    const cachedCalls = log.filter((e) => e.cached);
    const totalInput = log.reduce((sum, e) => sum + (e.inputTokens ?? 0), 0);
    const totalOutput = log.reduce((sum, e) => sum + (e.outputTokens ?? 0), 0);
    const totalCacheRead = log.reduce((sum, e) => sum + (e.cacheReadTokens ?? 0), 0);
    const cacheHitRate = log.length > 0 ? Math.round((cachedCalls.length / log.length) * 100) : 0;
    return { total: log.length, apiCalls: apiCalls.length, cachedCalls: cachedCalls.length, totalInput, totalOutput, totalCacheRead, cacheHitRate, recent: log.slice(-8).reverse() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, open]);

  return (
    <div className="fixed right-4 bottom-4 z-40">
      {open && (
        <div className="mb-2 w-72 rounded-2xl border border-line bg-surface p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">📊 Usage</p>
            <button onClick={() => setRefreshKey((k) => k + 1)} className="text-xs text-ink-soft hover:text-ink">
              ↻
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-ink-soft">Requests</dt>
            <dd className="text-right font-semibold text-ink">{stats.total}</dd>
            <dt className="text-ink-soft">Cache hits</dt>
            <dd className="text-right font-semibold text-sec-action">{stats.cachedCalls} ({stats.cacheHitRate}%)</dd>
            <dt className="text-ink-soft">API calls</dt>
            <dd className="text-right font-semibold text-ink">{stats.apiCalls}</dd>
            <dt className="text-ink-soft">Input tokens</dt>
            <dd className="text-right font-semibold text-ink">{stats.totalInput.toLocaleString()}</dd>
            <dt className="text-ink-soft">Output tokens</dt>
            <dd className="text-right font-semibold text-ink">{stats.totalOutput.toLocaleString()}</dd>
            <dt className="text-ink-soft">Cache-read tokens</dt>
            <dd className="text-right font-semibold text-sec-action">{stats.totalCacheRead.toLocaleString()}</dd>
          </dl>
          {stats.recent.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t border-line pt-2">
              {stats.recent.map((e, i) => (
                <p key={i} className="truncate text-[10px] text-ink-soft">
                  {e.cached ? "⚡" : "🌐"} {e.topic} · in {e.inputTokens ?? 0} / out {e.outputTokens ?? 0}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-ink px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:opacity-90"
      >
        📊 Usage
      </button>
    </div>
  );
}
