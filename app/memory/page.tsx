"use client";

import { useEffect, useState } from "react";
import { Brain, CalendarDays, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CONTENT_SKELETON_WIDTHS = ["82%", "67%", "91%", "73%", "88%", "61%"];

interface MemoryFile {
  date: string;
  filename: string;
  preview: string;
}

function formatEntryDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selected, setSelected] = useState<MemoryFile | null>(null);
  const [content, setContent] = useState("");
  const [loadedFilename, setLoadedFilename] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory-files", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const nextFiles = data.files || [];
        setFiles(nextFiles);
        setSelected(nextFiles[0] ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;

    fetch(`/api/memory?file=${encodeURIComponent(selected.filename)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setContent(data.content || "");
        setLoadedFilename(selected.filename);
      });
  }, [selected]);

  const filteredFiles = files.filter((file) => {
    const query = search.toLowerCase();
    return file.date.toLowerCase().includes(query) || file.preview.toLowerCase().includes(query);
  });
  const contentLoading = selected ? loadedFilename !== selected.filename : false;

  return (
    <div className="flex h-full min-h-0 bg-gray-950">
      <aside className="flex w-80 shrink-0 flex-col border-r border-gray-800 bg-gray-900/80">
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Daily Memory</h1>
              <p className="text-xs text-gray-500">{files.length} journal files from workspace memory</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dates or previews..."
              className="w-full bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-gray-800" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900 px-6 text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-400">No daily entries matched.</p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isActive = selected?.filename === file.filename;

              return (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => setSelected(file)}
                  className={`mb-2 w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{formatEntryDate(file.date)}</span>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                      {file.date}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-400">{file.preview || "No preview available."}</p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-6">
          {!selected ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-800 bg-gray-900/50 text-center">
              <Brain className="mb-4 h-10 w-10 text-gray-600" />
              <p className="text-sm text-gray-400">Select a daily entry to read its markdown.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-800 bg-gray-900/60 p-6 shadow-2xl shadow-black/20">
              <div className="mb-6 border-b border-gray-800 pb-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">Memory</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{formatEntryDate(selected.date)}</h2>
                <p className="mt-1 text-xs font-mono text-gray-500">{selected.filename}</p>
              </div>

              {contentLoading ? (
                <div className="space-y-3">
                  {CONTENT_SKELETON_WIDTHS.map((width) => (
                    <div
                      key={width}
                      className="h-4 animate-pulse rounded bg-gray-800"
                      style={{ width }}
                    />
                  ))}
                </div>
              ) : (
                <div className="prose-dark max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
