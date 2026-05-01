"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GitBranch, GitCommit, FolderOpen, ArrowLeft, Terminal, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  path: string;
  isGit: boolean;
  lastCommit: string;
  lastCommitDate: string;
  branch: string;
  status: string;
  commitCount: number;
  language: string;
}

interface FileInfo {
  name: string;
  type: 'file' | 'directory';
}

function ProjectDetailPageContent() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recentCommits, setRecentCommits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [readme, setReadme] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Load project info
      const res = await fetch("/api/projects");
      const data = await res.json();
      const proj = (data.projects || []).find((p: Project) => p.id === params.id);
      setProject(proj || null);

      if (proj) {
        // Load project details
        const detailRes = await fetch(`/api/projects/${params.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setFiles(detail.files || []);
          setRecentCommits(detail.recentCommits || []);
          setReadme(detail.readme || null);
        }
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-32 bg-gray-900 rounded animate-pulse" />
        <div className="h-10 w-64 bg-gray-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />
          </div>
          <div className="h-80 bg-gray-900 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Link href="/projects" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <p className="text-gray-500">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back */}
      <Link href="/projects" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="text-xs text-gray-600 font-mono mt-0.5 truncate max-w-sm">{project.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.language && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 font-mono border border-gray-700">
              {project.language}
            </span>
          )}
          {project.isGit && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
              project.status === "clean"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}>
              {project.status === "clean" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {project.status}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Project Info */}
        <div className="col-span-2 space-y-6">
          {/* Git Info */}
          {project.isGit && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" /> Repository
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-gray-500 w-20">Branch:</span>
                  <span className="font-mono text-emerald-400">{project.branch}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-gray-500 w-20">Status:</span>
                  <span className={project.status === 'clean' ? 'text-emerald-400' : 'text-yellow-400'}>{project.status}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-gray-500 w-20">Commits:</span>
                  <span>{project.commitCount}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-gray-500 w-20">Last:</span>
                  <span className="text-gray-300">{project.lastCommit}</span>
                </div>
                {project.lastCommitDate && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-gray-500 w-20">Date:</span>
                    <span>{project.lastCommitDate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Commits */}
          {recentCommits.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-blue-400" /> Recent Commits
              </h2>
              <div className="space-y-2">
                {recentCommits.map((commit, i) => (
                  <div key={i} className="text-xs text-gray-400 font-mono py-1 border-b border-gray-800 last:border-0">
                    {commit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* README */}
          {readme && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" /> README
              </h2>
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{readme}</pre>
            </div>
          )}
        </div>

        {/* Right: Files */}
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-400" /> Files
            </h2>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                  {file.type === 'directory' ? (
                    <FolderOpen className="w-3 h-3 text-blue-400 shrink-0" />
                  ) : (
                    <FileText className="w-3 h-3 text-gray-500 shrink-0" />
                  )}
                  <span className={file.type === 'directory' ? 'text-blue-400' : ''}>{file.name}</span>
                </div>
              ))}
              {files.length === 0 && <p className="text-xs text-gray-600">No files found</p>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Quick Actions
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => navigator.clipboard.writeText(`cd ${project.path}`)}
                className="w-full text-left text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded px-3 py-2 transition-colors"
              >
                📋 Copy cd path
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(project.path)}
                className="w-full text-left text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded px-3 py-2 transition-colors"
              >
                📁 Copy full path
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <ErrorBoundary label="Project detail page">
      <ProjectDetailPageContent />
    </ErrorBoundary>
  );
}
