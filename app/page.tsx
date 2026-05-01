"use client";

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Bot, CheckSquare, Clock, Calendar, AlertCircle, Activity, Zap, TrendingUp } from "lucide-react";

interface WeatherData {
  temp: number | null;
  condition: string;
  wind: number | null;
  humidity: number | null;
  icon: string;
  location: string;
  error?: string;
}

interface CalEvent {
  id?: string | number;
  title?: string;
  start?: string;
  end?: string;
  startDate?: string;
  endDate?: string;
  calendar?: string;
  allDay?: boolean;
  raw?: string;
}

interface CanvasEvent {
  id: string;
  title: string;
  dueDate: string;
  course: string;
  type: string;
}

interface CronJob {
  id?: string;
  name?: string;
  schedule?: string | { kind?: string; expr?: string; tz?: string };
  command?: string;
  enabled?: boolean;
  lastRun?: string;
  state?: { lastRunStatus?: string; lastDurationMs?: number };
}

function getCronExpr(schedule: CronJob["schedule"]): string {
  if (!schedule) return "";
  if (typeof schedule === "string") return schedule;
  return schedule.expr || "";
}

interface Agent {
  id: string;
  name: string;
  status: string;
  role: string;
  currentTask: string | null;
  avatar: string;
  color: string;
}

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard render failed", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Dashboard failed to render. Refresh the page to retry.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Clock24() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="text-4xl font-mono font-bold text-white tracking-wider">{time}</div>
      <div className="text-sm text-gray-400 mt-1">{date}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    idle: "bg-gray-700/50 text-gray-400 border-gray-600/30",
    busy: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border font-medium ${colors[status] || colors.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-400 status-pulse" : "bg-gray-500"}`} />
      {status}
    </span>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return iso; }
}

function formatDueDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return "Overdue";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

function getDueDateColor(iso: string) {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    const days = diff / 86400000;
    if (days < 0) return "text-red-400";
    if (days < 2) return "text-red-400";
    if (days < 5) return "text-yellow-400";
    return "text-gray-400";
  } catch { return "text-gray-400"; }
}

function DashboardContent() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [canvasEvents, setCanvasEvents] = useState<CanvasEvent[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/weather").then((r) => r.json()).catch(() => null),
      fetch("/api/calendar").then((r) => r.json()).catch(() => ({ events: [] })),
      fetch("/api/canvas").then((r) => r.json()).catch(() => ({ events: [] })),
      fetch("/api/cron").then((r) => r.json()).catch(() => ({ jobs: [] })),
      fetch("/api/agents").then((r) => r.json()).catch(() => ({ agents: [] })),
    ]).then(([w, cal, canvas, cron, ag]) => {
      setWeather(w);
      setCalEvents(cal.events || []);
      setCanvasEvents((canvas.events || []).slice(0, 6));
      setCronJobs(cron.jobs || []);
      setAgents(ag.agents || []);
      setLoading(false);
    });
  }, []);

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const activeCrons = cronJobs.filter((j) => j.enabled !== false).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse" />
            System Online
          </div>
          <Clock24 />
        </div>
        {/* Weather */}
        {weather && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-right min-w-[160px]">
            <div className="text-3xl">{weather.icon}</div>
            <div className="text-2xl font-bold text-white">
              {weather.temp !== null ? `${weather.temp}°F` : "—"}
            </div>
            <div className="text-sm text-gray-400">{weather.condition}</div>
            <div className="text-xs text-gray-500 mt-1">{weather.location}</div>
            {weather.wind !== null && (
              <div className="text-xs text-gray-500">Wind {weather.wind} mph · {weather.humidity}% humidity</div>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Bot, label: "Active Agents", value: loading ? "—" : `${activeAgents}/${agents.length}`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: Zap, label: "Cron Jobs", value: loading ? "—" : String(activeCrons), color: "text-purple-400", bg: "bg-purple-500/10" },
          { icon: Calendar, label: "Today's Events", value: loading ? "—" : String(calEvents.length), color: "text-blue-400", bg: "bg-blue-500/10" },
          { icon: AlertCircle, label: "Deadlines", value: loading ? "—" : String(canvasEvents.length), color: "text-yellow-400", bg: "bg-yellow-500/10" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Today's Schedule */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Today&apos;s Schedule</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : calEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No events today
            </div>
          ) : (
            <div className="space-y-2">
              {calEvents.slice(0, 8).map((ev, i) => (
                <div key={ev.id || i} className="flex items-start gap-3 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="w-1 h-full min-h-[32px] rounded-full bg-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">
                      {ev.title || ev.raw || "Event"}
                    </div>
                    {(ev.start || ev.startDate) && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatTime((ev.start || ev.startDate)!)}
                        {(ev.end || ev.endDate) && ` – ${formatTime((ev.end || ev.endDate)!)}`}
                      </div>
                    )}
                    {ev.calendar && (
                      <div className="text-xs text-blue-400 mt-0.5">{ev.calendar}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Deadlines */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Upcoming Deadlines</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : canvasEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No upcoming deadlines
            </div>
          ) : (
            <div className="space-y-2">
              {canvasEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className={`shrink-0 text-xs font-bold font-mono mt-0.5 w-14 text-right ${getDueDateColor(ev.dueDate)}`}>
                    {formatDueDate(ev.dueDate)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{ev.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{ev.course}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      ev.type === "exam" ? "bg-red-500/20 text-red-400" :
                      ev.type === "quiz" ? "bg-orange-500/20 text-orange-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {ev.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agents */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Agent Status</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="text-xl shrink-0">{agent.avatar}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {agent.currentTask || agent.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cron Jobs */}
      {!loading && cronJobs.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Active Cron Jobs</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cronJobs.slice(0, 8).map((job, i) => (
              <div key={job.id || i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full shrink-0 ${job.enabled !== false ? "bg-purple-400 status-pulse" : "bg-gray-600"}`} />
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{job.name || job.command || `Job ${i + 1}`}</div>
                  {getCronExpr(job.schedule) && <div className="text-xs text-purple-400 font-mono">{getCronExpr(job.schedule)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
