"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Folder, RefreshCw, ChevronRight, FolderOpen, Search, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ContentFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  mtime?: number;
  preview?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildTree(files: ContentFile[]): ContentFile[] {
  // Return only top-level items (no slash in path)
  return files.filter((f) => !f.path.includes("/"));
}

function getChildren(files: ContentFile[], parentPath: string): ContentFile[] {
  return files.filter((f) => {
    const parts = f.path.split("/");
    return parts.length === 2 && parts[0] === parentPath;
  });
}

export default function ContentPage() {
  const [files, setFiles] = useState<ContentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/content");
      const data = (await res.json()) as { files: ContentFile[] };
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace files");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchFiles(); }, [fetchFiles]);

  async function openFile(path: string) {
    setSelected(path);
    setContentLoading(true);
    setContent("");
    try {
      const res = await fetch(`/api/content?path=${encodeURIComponent(path)}`);
      const data = (await res.json()) as { content: string };
      setContent(data.content || "");
    } catch {
      setContent("Failed to load file.");
    } finally {
      setContentLoading(false);
    }
  }

  function toggleDir(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const topLevel = buildTree(files);
  const filtered = search
    ? files.filter(
        (f) => f.type === "file" && f.name.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const displayFiles = filtered ?? topLevel;

  function renderFile(file: ContentFile, depth = 0) {
    if (file.type === "directory") {
      const isExpanded = expanded.has(file.path);
      const children = getChildren(files, file.path);
      return (
        <div key={file.path}>
          <button
            onClick={() => toggleDir(file.path)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors text-left ${depth > 0 ? "ml-4" : ""}`}
          >
            <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-400/70 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-400/70 shrink-0" />
            )}
            <span className="text-gray-300 font-medium">{file.name}</span>
            <span className="ml-auto text-xs text-gray-600">{children.length}</span>
          </button>
          {isExpanded && (
            <div className="ml-4">
              {children.map((child) => renderFile(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={file.path}
        onClick={() => void openFile(file.path)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
          selected === file.path
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
        } ${depth > 0 ? "ml-4" : ""}`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{file.name}</span>
        {file.size !== undefined && (
          <span className="text-xs text-gray-600 shrink-0">{formatSize(file.size)}</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-white">Workspace</h1>
            <button onClick={fetchFiles} className="text-gray-600 hover:text-gray-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error && (
            <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
          {loading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : displayFiles.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">No files found</p>
          ) : (
            displayFiles.map((f) => renderFile(f))
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 text-sm text-gray-500 bg-gray-950">
              <Eye className="w-4 h-4" />
              <span className="text-gray-400">{selected}</span>
              {files.find((f) => f.path === selected)?.mtime && (
                <span className="ml-auto text-xs text-gray-600">
                  Modified: {formatDate(files.find((f) => f.path === selected)!.mtime!)}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {contentLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-4 bg-gray-800 rounded animate-pulse`} style={{ width: `${60 + i * 10}%` }} />
                  ))}
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-code:text-emerald-400 prose-code:bg-gray-800 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-a:text-emerald-400 prose-strong:text-gray-200 prose-blockquote:border-emerald-500 prose-blockquote:text-gray-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-800 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select a file to view</p>
              <p className="text-gray-700 text-sm mt-1">Browse the OpenClaw workspace</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
