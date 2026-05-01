"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, BookOpen, Gavel, Eye, BarChart2, Map } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CouncilEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  agents: string[];
  type: "decision" | "discussion" | "review" | "planning" | "status";
  source: string;
}

const TYPE_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  decision: {
    icon: <Gavel className="w-3.5 h-3.5" />,
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/30",
  },
  discussion: {
    icon: <Users className="w-3.5 h-3.5" />,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
  },
  review: {
    icon: <Eye className="w-3.5 h-3.5" />,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/30",
  },
  planning: {
    icon: <Map className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/30",
  },
  status: {
    icon: <BarChart2 className="w-3.5 h-3.5" />,
    color: "text-gray-400",
    bg: "bg-gray-400/10 border-gray-400/30",
  },
};

const AGENT_COLORS: Record<string, string> = {
  Bob: "bg-blue-500/20 text-blue-300",
  Gilfoyle: "bg-emerald-500/20 text-emerald-300",
  Albert: "bg-yellow-500/20 text-yellow-300",
  Charles: "bg-purple-500/20 text-purple-300",
  Joyce: "bg-pink-500/20 text-pink-300",
  Squeak: "bg-cyan-500/20 text-cyan-300",
  Richard: "bg-orange-500/20 text-orange-300",
  Pablo: "bg-red-500/20 text-red-300",
};

type TypeFilter = "all" | CouncilEntry["type"];

function CouncilPageContent() {
  const [entries, setEntries] = useState<CouncilEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CouncilEntry | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/council");
      const data = (await res.json()) as { entries: CouncilEntry[] };
      setEntries(data.entries || []);
      setError(null);
      if (!selected && data.entries?.length > 0) {
        setSelected(data.entries[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load council entries");
    } finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  const filtered = typeFilter === "all" ? entries : entries.filter((e) => e.type === typeFilter);

  const typeCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Council Log
            </h1>
            <button onClick={fetchEntries} className="text-gray-600 hover:text-gray-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">Agent deliberations &amp; decisions</p>

          {/* Type filter pills */}
          <div className="flex flex-wrap gap-1 mt-3">
            {(["all", "decision", "planning", "review", "discussion", "status"] as TypeFilter[]).map((t) => {
              const style = t === "all" ? null : TYPE_STYLES[t];
              const count = t === "all" ? entries.length : typeCounts[t] || 0;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors capitalize ${
                    typeFilter === t
                      ? style
                        ? `${style.color} ${style.bg}`
                        : "text-gray-200 bg-gray-700 border-gray-600"
                      : "text-gray-600 border-gray-800 hover:border-gray-700 hover:text-gray-400"
                  }`}
                >
                  {style && <span className={style.color}>{style.icon}</span>}
                  {t} {count > 0 && <span className="opacity-60">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error && (
            <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">No entries found</p>
          ) : (
            filtered.map((entry) => {
              const style = TYPE_STYLES[entry.type] || TYPE_STYLES.discussion;
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                    selected?.id === entry.id
                      ? "bg-gray-800 border border-gray-700"
                      : "hover:bg-gray-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 ${style.color}`}>{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 font-medium leading-tight truncate">{entry.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{entry.content.slice(0, 80)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-700">{entry.date}</span>
                        <span className="text-xs text-gray-700">·</span>
                        <span className="text-xs text-gray-700 truncate">{entry.source}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-3xl">
            <div className="flex items-start gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLES[selected.type]?.color || "text-gray-400"} ${TYPE_STYLES[selected.type]?.bg || ""}`}>
                    {TYPE_STYLES[selected.type]?.icon}
                    {selected.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span>{selected.date}</span>
                  <span>·</span>
                  <span>{selected.source}</span>
                </div>
              </div>
            </div>

            {selected.agents.length > 0 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-gray-600">Agents:</span>
                {selected.agents.map((agent) => (
                  <span key={agent} className={`text-xs px-2 py-0.5 rounded-full font-medium ${AGENT_COLORS[agent] || "bg-gray-700 text-gray-300"}`}>
                    {agent}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-code:text-emerald-400 prose-code:bg-gray-800 prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-a:text-emerald-400 prose-strong:text-gray-200 prose-li:text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-gray-800 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select an entry to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CouncilPage() {
  return (
    <ErrorBoundary label="Council page">
      <CouncilPageContent />
    </ErrorBoundary>
  );
}
