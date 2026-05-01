"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, FolderTree } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CONTENT_SKELETON_WIDTHS = ["76%", "69%", "88%", "57%", "81%"];

interface DocsTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: DocsTreeNode[];
}

function collectFirstFile(nodes: DocsTreeNode[]): DocsTreeNode | null {
  for (const node of nodes) {
    if (node.type === "file") {
      return node;
    }
    const nested = collectFirstFile(node.children || []);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function collectExpandedDirs(nodes: DocsTreeNode[], expanded = new Set<string>()) {
  for (const node of nodes) {
    if (node.type === "dir") {
      expanded.add(node.path);
      collectExpandedDirs(node.children || [], expanded);
    }
  }
  return expanded;
}

function filterTree(nodes: DocsTreeNode[], query: string): DocsTreeNode[] {
  if (!query) {
    return nodes;
  }

  const lowered = query.toLowerCase();

  return nodes.flatMap((node) => {
    if (node.type === "file") {
      return node.name.toLowerCase().includes(lowered) || node.path.toLowerCase().includes(lowered) ? [node] : [];
    }

    const filteredChildren = filterTree(node.children || [], query);
    if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lowered)) {
      return [{ ...node, children: filteredChildren }];
    }

    return [];
  });
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedPath,
  onSelect,
}: {
  node: DocsTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedPath: string | null;
  onSelect: (node: DocsTreeNode) => void;
}) {
  if (node.type === "dir") {
    const isOpen = expanded.has(node.path);

    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition hover:bg-gray-800/80"
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {isOpen && (node.children || []).map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  const isActive = selectedPath === node.path;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
        isActive
          ? "bg-emerald-500/10 text-white ring-1 ring-emerald-500/30"
          : "text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
      }`}
      style={{ paddingLeft: `${depth * 14 + 28}px` }}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function DocsPage() {
  const [tree, setTree] = useState<DocsTreeNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<DocsTreeNode | null>(null);
  const [content, setContent] = useState("");
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/docs-tree", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const nextTree = data.tree || [];
        setTree(nextTree);
        setExpandedDirs(collectExpandedDirs(nextTree));
        setSelected(collectFirstFile(nextTree));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected || selected.type !== "file") return;

    fetch(`/api/docs?path=${encodeURIComponent(selected.path)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setContent(data.content || "");
        setLoadedPath(selected.path);
      });
  }, [selected]);

  const visibleTree = useMemo(() => filterTree(tree, search), [search, tree]);
  const contentLoading = selected?.type === "file" ? loadedPath !== selected.path : false;

  return (
    <div className="flex h-full min-h-0 bg-gray-950">
      <aside className="flex w-80 shrink-0 flex-col border-r border-gray-800 bg-gray-900/80">
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Docs Tree</h1>
              <p className="text-xs text-gray-500">Workspace markdown from root files and `/docs`</p>
            </div>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter files or folders..."
            className="mt-4 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-10 animate-pulse rounded-xl bg-gray-800" />
              ))}
            </div>
          ) : visibleTree.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900 text-sm text-gray-500">
              No markdown files matched.
            </div>
          ) : (
            visibleTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                expanded={expandedDirs}
                onToggle={(dirPath) => {
                  setExpandedDirs((current) => {
                    const next = new Set(current);
                    if (next.has(dirPath)) {
                      next.delete(dirPath);
                    } else {
                      next.add(dirPath);
                    }
                    return next;
                  });
                }}
                selectedPath={selected?.path || null}
                onSelect={setSelected}
              />
            ))
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6">
          {!selected ? (
            <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-dashed border-gray-800 bg-gray-900/50 text-sm text-gray-400">
              Select a markdown file from the tree.
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-800 bg-gray-900/60 p-6 shadow-2xl shadow-black/20">
              <div className="mb-6 border-b border-gray-800 pb-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">Workspace Docs</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selected.name}</h2>
                <p className="mt-1 text-xs font-mono text-gray-500">{selected.path}</p>
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
