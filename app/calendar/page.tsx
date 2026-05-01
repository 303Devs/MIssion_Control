"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Zap, BookOpen } from "lucide-react";

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
  enabled?: boolean;
}

function getCronExpr(schedule: CronJob["schedule"]): string {
  if (!schedule) return "";
  if (typeof schedule === "string") return schedule;
  return schedule.expr || "";
}

type ViewMode = "week" | "month";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [canvasEvents, setCanvasEvents] = useState<CanvasEvent[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/calendar").then((r) => r.json()).catch(() => ({ events: [] })),
      fetch("/api/canvas").then((r) => r.json()).catch(() => ({ events: [] })),
      fetch("/api/cron").then((r) => r.json()).catch(() => ({ jobs: [] })),
    ]).then(([cal, canvas, cron]) => {
      setCalEvents(cal.events || []);
      setCanvasEvents(canvas.events || []);
      setCronJobs(cron.jobs || []);
      setLoading(false);
    });
  }, []);

  // Get week days for week view
  const getWeekDays = () => {
    const start = new Date(current);
    start.setDate(current.getDate() - current.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toDateString();
    const events: { title: string; color: string; time?: string }[] = [];

    // Cal events
    calEvents.forEach((ev) => {
      const startStr = ev.start || ev.startDate;
      const evDate = startStr ? new Date(startStr) : null;
      if (evDate && evDate.toDateString() === dateStr) {
        events.push({
          title: ev.title || ev.raw || "Event",
          color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
          time: startStr ? formatTime(startStr) : undefined,
        });
      }
    });

    // Canvas events
    canvasEvents.forEach((ev) => {
      const evDate = ev.dueDate ? new Date(ev.dueDate) : null;
      if (evDate && evDate.toDateString() === dateStr) {
        events.push({
          title: `${ev.title} (${ev.course})`,
          color: "bg-green-500/20 text-green-300 border-green-500/30",
          time: ev.dueDate ? formatTime(ev.dueDate) : undefined,
        });
      }
    });

    return events;
  };

  const navigate = (dir: -1 | 1) => {
    const next = new Date(current);
    if (view === "week") {
      next.setDate(current.getDate() + dir * 7);
    } else {
      next.setMonth(current.getMonth() + dir);
    }
    setCurrent(next);
  };

  const weekDays = getWeekDays();
  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const headerLabel = view === "week"
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule · Deadlines · Cron Jobs</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-400">Personal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-gray-400">School</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-gray-400">Cron</span>
            </div>
          </div>
          {/* View toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
            {(["week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium capitalize ${
                  view === v ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Nav */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrent(new Date())}
              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
            >
              Today
            </button>
            <button onClick={() => navigate(1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-base font-semibold text-white mb-4">{headerLabel}</div>

      {loading ? (
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      ) : view === "week" ? (
        /* WEEK VIEW */
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div key={i} className={`text-center py-3 border-r border-gray-800 last:border-r-0 ${isToday ? "bg-emerald-500/5" : ""}`}>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{DAY_NAMES[day.getDay()]}</div>
                  <div className={`text-lg font-bold mt-0.5 ${isToday ? "text-emerald-400" : "text-white"}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Event cells */}
          <div className="grid grid-cols-7 flex-1 overflow-y-auto">
            {weekDays.map((day, i) => {
              const events = getEventsForDay(day);
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div key={i} className={`border-r border-gray-800 last:border-r-0 p-2 space-y-1 ${isToday ? "bg-emerald-500/5" : ""}`}>
                  {events.map((ev, j) => (
                    <div key={j} className={`text-xs px-2 py-1.5 rounded-md border ${ev.color} leading-tight`}>
                      {ev.time && <div className="font-mono opacity-70 text-[10px]">{ev.time}</div>}
                      <div className="truncate">{ev.title}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MONTH VIEW */
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
          {/* Day name headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center py-3 text-xs text-gray-500 uppercase tracking-wide border-r border-gray-800 last:border-r-0">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "1fr" }}>
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-gray-800 last:border-r-0 bg-gray-950/50" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = new Date(year, month, i + 1);
              const isToday = day.toDateString() === today.toDateString();
              const events = getEventsForDay(day);
              return (
                <div
                  key={i}
                  className={`border-r border-b border-gray-800 last:border-r-0 p-1.5 min-h-[80px] ${
                    isToday ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-emerald-500 text-white" : "text-gray-400"
                  }`}>
                    {i + 1}
                  </div>
                  {events.slice(0, 3).map((ev, j) => (
                    <div key={j} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${ev.color} border`}>
                      {ev.title}
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="text-[10px] text-gray-500">+{events.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom: Cron jobs */}
      {cronJobs.length > 0 && (
        <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Scheduled Cron Jobs</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {cronJobs.slice(0, 6).map((job, i) => (
              <div key={job.id || i} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full shrink-0 ${job.enabled !== false ? "bg-purple-400 status-pulse" : "bg-gray-600"}`} />
                <div className="min-w-0">
                  <div className="text-xs text-white font-medium truncate">{job.name || `Job ${i + 1}`}</div>
                  {getCronExpr(job.schedule) && <div className="text-[10px] font-mono text-purple-400">{getCronExpr(job.schedule)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar: upcoming deadlines */}
      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">Upcoming Canvas Deadlines</h3>
        </div>
        {canvasEvents.length === 0 ? (
          <p className="text-xs text-gray-500">No upcoming deadlines found</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {canvasEvents.slice(0, 6).map((ev) => (
              <div key={ev.id} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg">
                <div className="shrink-0">
                  <div className={`text-xs font-bold ${
                    (() => {
                      const days = (new Date(ev.dueDate).getTime() - Date.now()) / 86400000;
                      return days < 2 ? "text-red-400" : days < 5 ? "text-yellow-400" : "text-green-400";
                    })()
                  }`}>
                    {(() => {
                      const days = Math.ceil((new Date(ev.dueDate).getTime() - Date.now()) / 86400000);
                      return days <= 0 ? "Due!" : days === 1 ? "1d" : `${days}d`;
                    })()}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-white truncate">{ev.title}</div>
                  <div className="text-[10px] text-gray-500 truncate">{ev.course}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
