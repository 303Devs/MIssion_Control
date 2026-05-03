"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState } from "react";
import { ArrowDown, Workflow } from "lucide-react";

interface PipelineStage {
  id: string;
  order: number;
  name: string;
  description: string;
  agentName: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "busy" | "error";
  currentTask: string | null;
}

const STATUS_STYLES: Record<Agent["status"], string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  idle: "border-gray-700 bg-gray-800/80 text-gray-400",
  busy: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
};

function PipelinePageContent() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/pipeline", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/agents", { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([pipelineData, agentsData]) => {
        setStages(pipelineData.stages || []);
        setSource(pipelineData.source || "");
        setAgents(agentsData.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const agentMap = new Map(agents.map((agent) => [agent.name.toLowerCase(), agent]));

  return (
    <div className="min-h-full overflow-y-auto bg-gray-950 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">Pipeline</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Workflow Stages</h1>
            <p className="mt-1 text-sm text-gray-400">Parsed live from `ORG.md` and cross-referenced with agent status.</p>
          </div>
          {source ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 px-4 py-3 text-xs font-mono text-gray-500">
              {source}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-48 animate-pulse rounded-3xl bg-gray-900" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const agent = stage.agentName ? agentMap.get(stage.agentName.toLowerCase()) : undefined;

              return (
                <div key={stage.id} className="flex flex-col items-start">
                  <article className="w-full rounded-3xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                            Stage {stage.order}
                          </span>
                          <h2 className="text-xl font-semibold text-white">{stage.name}</h2>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-gray-400">{stage.description}</p>
                      </div>

                      <div className="min-w-[16rem] rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Handled by</p>
                        <p className="mt-2 text-lg font-semibold text-white">{stage.agentName || "Unassigned"}</p>
                        <p className="mt-1 text-sm text-gray-400">{agent?.role || "No matching agent record"}</p>
                        <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[agent?.status || "idle"]}`}>
                          <span className={`h-2 w-2 rounded-full ${agent?.status === "active" ? "bg-emerald-400 status-pulse" : agent?.status === "busy" ? "bg-yellow-400 status-pulse" : agent?.status === "error" ? "bg-red-400" : "bg-gray-500"}`} />
                          {agent?.status || "idle"}
                        </div>
                        <p className="mt-3 text-sm text-gray-300">{agent?.currentTask || "No live task reported."}</p>
                      </div>
                    </div>
                  </article>

                  {index < stages.length - 1 && (
                    <div className="flex h-10 items-center pl-8 text-gray-600">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {!stages.length && (
              <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-800 bg-gray-900/50 px-6 text-center">
                <Workflow className="mb-4 h-10 w-10 text-gray-600" />
                <p className="text-base font-semibold text-white">No pipeline configured</p>
                <p className="mt-2 text-sm text-gray-400">No pipeline stages defined. Add a `## The Pipeline` section to ORG.md to configure stages.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <ErrorBoundary label="Pipeline page">
      <PipelinePageContent />
    </ErrorBoundary>
  );
}
