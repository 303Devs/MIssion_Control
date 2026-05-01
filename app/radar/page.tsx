"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useState, useEffect, useCallback } from "react";
import { Radio, RefreshCw, GitCommit, FileText, Bot, Clock, Timer, Search, Filter, Wifi } from "lucide-react";

interface RadarEvent {
  id: string;
  timestamp: number;
  type: "commit" | "file" | "agent" | "cron";
  title: string;
  detail: string;
  source: string;
  repo?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  commit: {
    icon: <GitCommit className="w-4 h-4" />,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "Commit",
  },
  file: {
    icon: <FileText className="w-4 h-4" />,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    label: "File",
  },
  agent: {
    icon: <Bot className="w-4 h-4" />,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Agent",
  },
  cron: {
    icon: <Timer className="w-4 h-4" />,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    label: "Cron",
  },
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

type TypeFilter = "all" | RadarEvent["type"];

function RadarPageContent() {
  const [events, setEvents] = useState<RadarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/radar");
      const data = (await res.json()) as { events: RadarEvent[] };
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load radar events");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchEvents();
    if (!autoRefresh) return;
    const interval = setInterval(fetchEvents, 20000);
    return () => clearInterval(interval);
  }, [fetchEvents, autoRefresh]);

  const filtered = events.filter((e) => {
    const matchType = typeFilter === "all" || e.type === typeFilter;
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.source.toLowerCase().includes(search.toLowerCase()) ||
      e.detail.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const typeCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Radar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live activity across all projects and agents · {events.length} events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              autoRefresh
                ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                : "text-gray-400 border-gray-700 hover:bg-gray-800"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
            Live
          </button>
          <button onClick={fetchEvents} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Type summary chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["all", "commit", "agent", "file", "cron"] as TypeFilter[]).map((t) => {
          const cfg = t === "all" ? null : TYPE_CONFIG[t];
          const count = t === "all" ? events.length : typeCounts[t] || 0;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                typeFilter === t
                  ? cfg
                    ? `${cfg.color} ${cfg.bg} border-transparent`
                    : "text-gray-200 bg-gray-800 border-gray-700"
                  : "text-gray-500 border-gray-800 hover:border-gray-700 hover:text-gray-400"
              }`}
            >
              {cfg && <span className={cfg.color}>{cfg.icon}</span>}
              <span className="capitalize">{t}</span>
              <span className="text-xs opacity-60">{count}</span>
            </button>
          );
        })}
        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter events..."
            className="bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-gray-800 rounded-2xl">
          <Wifi className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No activity recorded yet</p>
          <p className="text-gray-600 text-sm mt-1">Events will appear as agents run tasks, commits land, and crons fire.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Filter className="w-10 h-10 text-gray-800 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No events match the filter</p>
          <p className="text-gray-600 text-sm mt-1">Try clearing the search or selecting a different type.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((event) => {
            const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.file;
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-900 transition-colors group"
              >
                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${cfg.bg}`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm text-gray-200 font-medium truncate max-w-md">{event.title}</span>
                    {event.repo && (
                      <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
                        {event.repo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                    <span>{event.detail}</span>
                    {event.source !== event.repo && (
                      <>
                        <span>·</span>
                        <span>{event.source}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
                  <Clock className="w-3 h-3" />
                  {timeAgo(event.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RadarPage() {
  return (
    <ErrorBoundary label="Radar page">
      <RadarPageContent />
    </ErrorBoundary>
  );
}
