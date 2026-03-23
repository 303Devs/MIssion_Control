"use client";

import { useEffect, useState } from "react";
import { Brain, FileText, ChevronRight, RefreshCw, Search, Calendar, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MemoryFile {
  name: string;
  size: number;
  mtime: string;
  preview: string;
}

type Tab = "daily" | "longterm";

function formatDate(filename: string) {
  // Try to extract date from filename like "2026-03-22.md" or "memory-2026-03-22.md"
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const d = new Date(match[1] + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  return filename.replace(/\.(md|txt)$/, "");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d === 0) return h === 0 ? "today" : `${h}h ago`;
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function MemoryPage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [longTermContent, setLongTermContent] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadMemory = async (selectFirst = false) => {
    setRefreshing(true);
    const [daily, lt] = await Promise.all([
      fetch("/api/memory").then((r) => r.json()),
      fetch("/api/memory?type=longterm").then((r) => r.json()),
    ]);
    const newFiles = daily.files || [];
    setFiles(newFiles);
    setLongTermContent(lt.content || "");
    if (selectFirst && newFiles.length > 0) {
      setSelected(newFiles[0].name);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadMemory(true); }, []);

  useEffect(() => {
    if (!selected) return;
    setContentLoading(true);
    fetch(`/api/memory?file=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((d) => { setContent(d.content || ""); setContentLoading(false); });
  }, [selected]);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.preview.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Tab toggle + refresh */}
        <div className="p-3 border-b border-gray-800 flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700 flex-1">
            <button
              onClick={() => setTab("daily")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "daily" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3 h-3" />
              Daily
            </button>
            <button
              onClick={() => setTab("longterm")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "longterm" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Database className="w-3 h-3" />
              Long-term
            </button>
          </div>
          <button
            onClick={() => loadMemory(false)}
            disabled={refreshing}
            className="p-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {tab === "daily" && (
          <>
            {/* Search */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <input
                  placeholder="Search memory..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto py-1">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-600">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No memory files found
                </div>
              ) : (
                filtered.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => setSelected(file.name)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-800 transition-colors flex items-start gap-2 ${
                      selected === file.name ? "bg-gray-800 border-r-2 border-emerald-500" : ""
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-200 truncate">
                        {formatDate(file.name)}
                      </div>
                      <div className="text-[10px] text-gray-600 flex items-center gap-1.5 mt-0.5">
                        <span>{formatRelTime(file.mtime)}</span>
                        <span>·</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-700 shrink-0 mt-0.5" />
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {tab === "longterm" && (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-xs text-gray-500 text-center py-4">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Long-term memory
              <br />from MEMORY.md
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "daily" ? (
          <div className="p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                <Brain className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Select a memory file to view</p>
              </div>
            ) : contentLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-4 bg-gray-800 rounded animate-pulse`} style={{ width: `${70 + Math.random() * 30}%` }} />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4 pb-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold text-white">{formatDate(selected)}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">{selected}</p>
                </div>
                <div className="prose-dark">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4 pb-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Long-term Memory</h2>
              <p className="text-xs text-gray-500 mt-1">~/.openclaw/workspace/MEMORY.md</p>
            </div>
            <div className="prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{longTermContent}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
