"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  UserCircle2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { shellNavItems } from "@/components/shell-nav";

interface LiveAgent {
  id: string;
  name: string;
  status: "active" | "idle" | "busy" | "error";
  avatar?: string;
  currentTask?: string | null;
}

interface ActivityEvent {
  id: string;
  timestamp: number;
  type: "spawn" | "done" | "error" | "cron";
  text: string;
  source: "session" | "cron";
}

function formatEventTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "Unknown";

  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function SearchModal({
  open,
  query,
  agents,
  onClose,
  onQueryChange,
}: {
  open: boolean;
  query: string;
  agents: LiveAgent[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredNavItems = normalizedQuery
    ? shellNavItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
    : shellNavItems;
  const filteredAgents = normalizedQuery
    ? agents.filter((agent) => agent.name.toLowerCase().includes(normalizedQuery))
    : agents;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/50">
        <div className="border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-gray-900 px-3 py-3">
            <Search className="h-4 w-4 text-emerald-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search navigation or agents..."
              className="flex-1 bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-500"
            />
            <kbd className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-400">
              Esc
            </kbd>
          </div>
        </div>

        <div className="grid max-h-[70vh] grid-cols-2 divide-x divide-gray-800">
          <div className="overflow-y-auto p-3">
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Navigation
            </div>
            <div className="space-y-1">
              {filteredNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-300 transition-colors hover:border-emerald-500/20 hover:bg-gray-900 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-gray-500" />
                  <span>{label}</span>
                </Link>
              ))}

              {filteredNavItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500">
                  No matching pages
                </div>
              )}
            </div>
          </div>

          <div className="overflow-y-auto p-3">
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Agents
            </div>
            <div className="space-y-1">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={onClose}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:border-emerald-500/20 hover:bg-gray-900 hover:text-white"
                >
                  <span className="text-base leading-none">{agent.avatar || "•"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{agent.name}</div>
                    {agent.currentTask && (
                      <div className="truncate text-xs text-gray-500">{agent.currentTask}</div>
                    )}
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      agent.status === "active"
                        ? "bg-emerald-400 status-pulse"
                        : agent.status === "error"
                          ? "bg-red-400"
                          : agent.status === "busy"
                            ? "bg-yellow-400"
                            : "bg-gray-500"
                    }`}
                  />
                </button>
              ))}

              {filteredAgents.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500">
                  No matching agents
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({
  activityOpen,
  onOpenSearch,
  onToggleActivity,
  searchQuery,
}: {
  activityOpen: boolean;
  onOpenSearch: () => void;
  onToggleActivity: () => void;
  searchQuery: string;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-800 bg-gray-950 px-4">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-left transition-colors hover:border-gray-700 focus:border-emerald-500/50 focus:outline-none"
      >
        <Search className="h-4 w-4 text-gray-500" />
        <span className={`flex-1 text-sm ${searchQuery ? "text-gray-200" : "text-gray-500"}`}>
          {searchQuery || "Search pages and agents..."}
        </span>
        <kbd className="hidden items-center gap-1 rounded border border-gray-700 bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-400 sm:inline-flex">
          Ctrl
          <span className="text-gray-600">+</span>
          K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleActivity}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            activityOpen
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:text-white"
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity
        </button>

        <button className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-900 hover:text-white">
          <UserCircle2 className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}

function LiveActivityPanel({
  events,
  open,
  onToggle,
}: {
  events: ActivityEvent[];
  open: boolean;
  onToggle: () => void;
}) {
  const badgeClasses = useMemo(
    () => ({
      spawn: "border-blue-500/20 bg-blue-500/10 text-blue-300",
      done: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      error: "border-red-500/20 bg-red-500/10 text-red-300",
      cron: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    }),
    []
  );

  return (
    <aside
      className={`relative h-full shrink-0 border-l border-gray-800 bg-gray-900/95 backdrop-blur transition-all duration-200 ${
        open ? "w-80" : "w-12"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-800 px-3 py-3">
          <div className={`flex items-center gap-2 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <Activity className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Live Activity</h2>
          </div>
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label={open ? "Collapse activity panel" : "Expand activity panel"}
          >
            {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {open ? (
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {events.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeClasses[item.type]}`}
                  >
                    {item.type}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Clock3 className="h-3 w-3" />
                    {formatEventTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-200">{item.text}</p>
              </div>
            ))}

            {events.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-800 px-3 py-8 text-center text-sm text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="-rotate-90 whitespace-nowrap text-xs font-medium uppercase tracking-[0.3em] text-gray-500">
              Live Activity
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function AgentStatusBar({ agents }: { agents: LiveAgent[] }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-t border-gray-800 bg-gray-950 px-4">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="flex min-w-fit items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 text-sm text-gray-200"
        >
          <span className="text-base leading-none">{agent.avatar || "•"}</span>
          <span>{agent.name}</span>
          <span
            className={`h-2 w-2 rounded-full ${
              agent.status === "active"
                ? "bg-emerald-400 status-pulse"
                : agent.status === "error"
                  ? "bg-red-400"
                  : agent.status === "busy"
                    ? "bg-yellow-400"
                    : "bg-gray-500"
            }`}
          />
        </div>
      ))}

      {agents.length === 0 && <div className="text-sm text-gray-500">No agents available</div>}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [activityOpen, setActivityOpen] = useState(true);
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      try {
        const response = await fetch("/api/agents", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) {
          setAgents(data.agents || []);
        }
      } catch {
        if (!cancelled) {
          setAgents([]);
        }
      }
    };

    loadAgents();
    const intervalId = window.setInterval(loadAgents, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      try {
        const response = await fetch("/api/activity", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) {
          setActivityEvents(data.events || []);
        }
      } catch {
        if (!cancelled) {
          setActivityEvents([]);
        }
      }
    };

    loadActivity();
    const intervalId = window.setInterval(loadActivity, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sidebarQuery = searchOpen ? searchQuery : "";

  return (
    <body className="flex h-screen overflow-hidden bg-gray-950 text-gray-100 antialiased">
      <Sidebar searchQuery={sidebarQuery} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          activityOpen={activityOpen}
          onOpenSearch={() => setSearchOpen(true)}
          onToggleActivity={() => setActivityOpen((value) => !value)}
          searchQuery={sidebarQuery}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-gray-950">
            <div className="h-full overflow-y-auto">{children}</div>
          </main>
          <LiveActivityPanel
            events={activityEvents}
            open={activityOpen}
            onToggle={() => setActivityOpen((value) => !value)}
          />
        </div>
        <AgentStatusBar agents={agents} />
      </div>

      <SearchModal
        open={searchOpen}
        query={searchQuery}
        agents={agents}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery("");
        }}
        onQueryChange={setSearchQuery}
      />
    </body>
  );
}
