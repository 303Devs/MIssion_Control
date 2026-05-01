"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState } from "react";
import { GitBranch, GitCommit, Clock, RefreshCw, FolderOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  path: string;
  isGit: boolean;
  lastCommit: string;
  lastCommitDate: string;
  branch: string;
  status: "clean" | "modified";
  commitCount: number;
  modifiedFiles: number;
  language: string;
}

const LANG_COLORS: Record<string, string> = {
  "Next.js": "text-white bg-gray-700",
  "React": "text-cyan-400 bg-cyan-500/10",
  "Node.js": "text-green-400 bg-green-500/10",
  "Python": "text-yellow-400 bg-yellow-500/10",
  "Rust": "text-orange-400 bg-orange-500/10",
  "Go": "text-sky-400 bg-sky-500/10",
  "TypeScript": "text-blue-400 bg-blue-500/10",
  "Java": "text-red-400 bg-red-500/10",
  "Swift": "text-orange-300 bg-orange-500/10",
  "Ruby": "text-red-400 bg-red-500/10",
};

function ProjectsPageContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async () => {
    setRefreshing(true);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (cancelled) return;
      setProjects(data.projects || []);
      setLoading(false);
      setRefreshing(false);
    };

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} repositories in ~/Projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-48"
          />
          <button
            onClick={loadProjects}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              key={project.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-black/20 group block cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                  <h3 className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors">
                    {project.name}
                  </h3>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(project.path)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-300"
                  title="Copy path"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Language */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${LANG_COLORS[project.language] || "text-gray-400 bg-gray-700"}`}>
                  {project.language}
                </span>
                {project.isGit && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    project.status === "clean"
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-yellow-400 bg-yellow-500/10"
                  }`}>
                    {project.status === "modified" && project.modifiedFiles > 0
                      ? `${project.modifiedFiles} changed`
                      : project.status}
                  </span>
                )}
              </div>

              {/* Git info */}
              {project.isGit ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <GitBranch className="w-3 h-3 text-gray-600 shrink-0" />
                    <span className="font-mono text-gray-300">{project.branch}</span>
                    {project.commitCount > 0 && (
                      <span className="text-gray-600">· {project.commitCount} commits</span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <GitCommit className="w-3 h-3 text-gray-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{project.lastCommit}</span>
                  </div>
                  {project.lastCommitDate && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{project.lastCommitDate}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-600">No git repository</div>
              )}
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-500">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm">No projects found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ErrorBoundary label="Projects page">
      <ProjectsPageContent />
    </ErrorBoundary>
  );
}
