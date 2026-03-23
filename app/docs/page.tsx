"use client";

import { useEffect, useState } from "react";
import { FileText, Search, ChevronRight, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocFile {
  name: string;
  path: string;
  relativePath: string;
  dir: string;
  size: number;
  mtime: string;
  preview: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DocsPage() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selected, setSelected] = useState<DocFile | null>(null);
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((d) => {
        setFiles(d.files || []);
        if (d.files?.length > 0) {
          setSelected(d.files[0]);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setContentLoading(true);
    fetch(`/api/docs?path=${encodeURIComponent(selected.path)}`)
      .then((r) => r.json())
      .then((d) => { setContent(d.content || ""); setContentLoading(false); });
  }, [selected]);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.dir.toLowerCase().includes(search.toLowerCase()) ||
    f.preview.toLowerCase().includes(search.toLowerCase())
  );

  // Group by dir
  const grouped = filtered.reduce((acc: Record<string, DocFile[]>, file) => {
    const key = file.dir;
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white mb-3">Documents</h2>
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <input
              placeholder="Search docs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-full"
            />
          </div>
          {!loading && (
            <div className="text-xs text-gray-500 mt-2">{filtered.length} files</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-600">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No documents found
            </div>
          ) : (
            Object.entries(grouped).map(([dir, dirFiles]) => (
              <div key={dir}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  <FolderOpen className="w-3 h-3" />
                  {dir === "." ? "root" : dir}
                </div>
                {dirFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelected(file)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors flex items-start gap-2 ${
                      selected?.path === file.path ? "bg-gray-800 border-r-2 border-emerald-500" : ""
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-200 truncate">{file.name}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {formatRelTime(file.mtime)} · {formatSize(file.size)}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-700 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a document to view</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4 pb-4 border-b border-gray-800 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                <p className="text-xs text-gray-500 font-mono mt-1">{selected.relativePath}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatSize(selected.size)} · Updated {formatRelTime(selected.mtime)}
                </p>
              </div>
            </div>
            {contentLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
              </div>
            ) : (
              <div className="prose-dark">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
