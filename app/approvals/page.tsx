"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw, Shield, AlertTriangle, Inbox } from "lucide-react";

interface ApprovalRequest {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  action: string;
  description: string;
  risk: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
  resolvedAt?: number;
}

const RISK_STYLES: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  high: "text-red-400 bg-red-400/10 border-red-400/30",
};

type Filter = "pending" | "all" | "resolved";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      const data = (await res.json()) as { approvals: ApprovalRequest[] };
      setApprovals(data.approvals || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchApprovals();
    const interval = setInterval(fetchApprovals, 15000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  async function resolve(id: string, status: "approved" | "rejected") {
    setResolving(id);
    try {
      await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, resolvedAt: Date.now() } : a))
      );
    } finally {
      setResolving(null);
    }
  }

  const filtered = approvals.filter((a) => {
    if (filter === "pending") return a.status === "pending";
    if (filter === "resolved") return a.status !== "pending";
    return true;
  });

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Approvals
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Agent actions requiring human sign-off</p>
        </div>
        <button
          onClick={fetchApprovals}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-5 p-1 bg-gray-900 border border-gray-800 rounded-lg w-fit">
        {(["pending", "all", "resolved"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors capitalize ${
              filter === f ? "bg-gray-800 text-gray-100" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Inbox className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {filter === "pending" ? "No pending approvals" : "Nothing here yet"}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {filter === "pending" ? "Agents are running autonomously." : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((approval) => (
            <div
              key={approval.id}
              className={`p-4 rounded-xl border transition-all ${
                approval.status === "pending"
                  ? "bg-gray-900 border-gray-700 hover:border-gray-600"
                  : "bg-gray-900/40 border-gray-800 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{approval.action}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_STYLES[approval.risk || "low"]}`}>
                      {approval.risk || "low"} risk
                    </span>
                    {approval.status !== "pending" && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${approval.status === "approved" ? "text-emerald-400" : "text-red-400"}`}>
                        {approval.status === "approved"
                          ? <CheckCircle className="w-3.5 h-3.5" />
                          : <XCircle className="w-3.5 h-3.5" />}
                        {approval.status}
                      </span>
                    )}
                  </div>
                  {approval.description && (
                    <p className="text-sm text-gray-400 mb-2">{approval.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(approval.timestamp).toLocaleString()}
                    </span>
                    <span>Agent: <span className="text-gray-400">{approval.agentName}</span></span>
                    {approval.resolvedAt && (
                      <span>Resolved: {new Date(approval.resolvedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {approval.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={resolving === approval.id}
                      onClick={() => void resolve(approval.id, "rejected")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 border border-red-400/30 bg-red-400/5 rounded-lg hover:bg-red-400/10 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      disabled={resolving === approval.id}
                      onClick={() => void resolve(approval.id, "approved")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 rounded-lg hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl border border-gray-800 bg-gray-900/50 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-gray-400 font-medium">How approvals work</p>
          <p className="text-xs text-gray-600 mt-1">
            Agents write requests to{" "}
            <code className="text-gray-500">~/.openclaw/workspace/approvals.json</code>.
            Pending items surface here automatically. Approve or reject to unblock the agent.
          </p>
        </div>
      </div>
    </div>
  );
}
