"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useState, useEffect, useCallback } from "react";
import { Server, RefreshCw, HardDrive, Cpu, MemoryStick, Clock, Wifi, WifiOff, CheckCircle, AlertTriangle, Terminal, Timer } from "lucide-react";

interface SystemData {
  gateway: { status: string; latencyMs?: number };
  disk: { filesystem: string; total: string; used: string; available: string; percent: string; mount: string } | null;
  memory: { total: number; used: number; free: number; percent: number; totalGb: string; usedGb: string };
  cpu: { count: number; load1: string; load5: string; model: string };
  uptime: { seconds: number; formatted: string };
  node: string;
  platform: string;
  cron: { total: number; enabled: number; lastErrors: { name: string; error: string }[] };
  agents: { activeSessions: number; openclawProcesses: number };
  timestamp: number;
}

function GaugeBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  gauge,
  gaugeColor,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  sub?: string;
  gauge?: number;
  gaugeColor?: string;
  accent?: string;
}) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${accent || "border-gray-800"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-500">{icon}</span>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-white mb-1">{value}</div>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
      {gauge !== undefined && gaugeColor && (
        <div className="mt-3">
          <GaugeBar percent={gauge} color={gaugeColor} />
          <p className="text-xs text-gray-600 mt-1">{gauge}% used</p>
        </div>
      )}
    </div>
  );
}

function SystemPageContent() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/system");
      const json = (await res.json()) as SystemData;
      setData(json);
      setLastFetch(new Date());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const diskPercent = data?.disk
    ? parseInt(data.disk.percent.replace("%", ""), 10) || 0
    : 0;

  const gatewayOnline = data?.gateway.status === "online" || data?.gateway.status === "ok";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            System
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            OpenClaw health &amp; infrastructure status
            {lastFetch && (
              <span className="ml-2 text-gray-700">· Updated {lastFetch.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Gateway status banner */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
            gatewayOnline
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}>
            {gatewayOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className={`text-sm font-semibold ${gatewayOnline ? "text-emerald-400" : "text-red-400"}`}>
                OpenClaw Gateway: {data.gateway.status}
              </p>
              <p className="text-xs text-gray-600">
                {gatewayOnline
                  ? `Responding at 127.0.0.1:18789${data.gateway.latencyMs !== undefined ? ` · ${data.gateway.latencyMs}ms` : ""}`
                  : "Not responding at 127.0.0.1:18789"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="System Uptime"
              value={data.uptime.formatted}
              sub={data.platform}
            />

            <StatCard
              icon={<Cpu className="w-4 h-4" />}
              label="CPU"
              value={`${data.cpu.load1} load`}
              sub={`${data.cpu.count} cores · 5m avg: ${data.cpu.load5}`}
              gauge={Math.round((parseFloat(data.cpu.load1) / data.cpu.count) * 100)}
              gaugeColor={
                parseFloat(data.cpu.load1) / data.cpu.count > 0.8
                  ? "bg-red-500"
                  : parseFloat(data.cpu.load1) / data.cpu.count > 0.5
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              }
            />

            <StatCard
              icon={<MemoryStick className="w-4 h-4" />}
              label="Memory"
              value={`${data.memory.usedGb}GB / ${data.memory.totalGb}GB`}
              sub={`${data.memory.free > 0 ? ((data.memory.free / 1024 ** 3).toFixed(1)) : "?"}GB free`}
              gauge={data.memory.percent}
              gaugeColor={
                data.memory.percent > 85 ? "bg-red-500" :
                data.memory.percent > 65 ? "bg-yellow-500" : "bg-emerald-500"
              }
            />

            {data.disk && (
              <StatCard
                icon={<HardDrive className="w-4 h-4" />}
                label="Disk"
                value={`${data.disk.used} / ${data.disk.total}`}
                sub={`${data.disk.available} available on ${data.disk.mount}`}
                gauge={diskPercent}
                gaugeColor={
                  diskPercent > 90 ? "bg-red-500" :
                  diskPercent > 75 ? "bg-yellow-500" : "bg-emerald-500"
                }
              />
            )}

            <StatCard
              icon={<Timer className="w-4 h-4" />}
              label="Cron Jobs"
              value={`${data.cron.enabled} / ${data.cron.total}`}
              sub={
                data.cron.lastErrors.length > 0
                  ? `${data.cron.lastErrors.length} failing`
                  : "All healthy"
              }
              accent={data.cron.lastErrors.length > 0 ? "border-yellow-500/30" : undefined}
            />

            <StatCard
              icon={<Server className="w-4 h-4" />}
              label="Agent Processes"
              value={data.agents.openclawProcesses.toString()}
              sub={`${data.agents.activeSessions} active sessions · Node ${data.node}`}
              accent={data.agents.openclawProcesses > 0 ? "border-emerald-500/20" : undefined}
            />
          </div>

          {/* CPU model */}
          <div className="mt-4 p-3 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-2 text-sm">
              <Terminal className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600">CPU Model:</span>
              <span className="text-gray-400">{data.cpu.model}</span>
              <span className="ml-auto text-xs text-gray-700">Node {data.node}</span>
            </div>
          </div>

          {/* Cron errors */}
          {data.cron.lastErrors.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Cron Errors</span>
              </div>
              <div className="space-y-1">
                {data.cron.lastErrors.map((err, i) => (
                  <div key={i} className="text-xs text-gray-500">
                    <span className="text-gray-400">{err.name}</span>: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All green */}
          {data.cron.lastErrors.length === 0 && gatewayOnline && (
            <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">All systems nominal</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-600">Failed to load system data</div>
      )}
    </div>
  );
}

export default function SystemPage() {
  return (
    <ErrorBoundary label="System page">
      <SystemPageContent />
    </ErrorBoundary>
  );
}
