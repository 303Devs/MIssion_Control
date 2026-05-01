"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, Bot, User, Search, Cpu } from "lucide-react";

interface Person {
  id: string;
  name: string;
  role: string;
  type: "human" | "agent";
  bio?: string;
  email?: string;
  skills?: string[];
  avatar?: string;
  color?: string;
  model?: string;
  status?: string;
  isOrchestrator?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400",
  busy: "bg-yellow-400",
  idle: "bg-gray-500",
  error: "bg-red-400",
};

const MODEL_COLORS: Record<string, string> = {
  "claude-opus": "text-purple-400",
  "claude-sonnet": "text-blue-400",
  "claude-haiku": "text-cyan-400",
  "gemini": "text-green-400",
};

function modelColor(model?: string): string {
  if (!model) return "text-gray-500";
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.includes(key)) return color;
  }
  return "text-gray-400";
}

function PersonCard({ person }: { person: Person }) {
  const isAgent = person.type === "agent";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 font-bold"
          style={{ backgroundColor: person.color ? `${person.color}22` : "#374151" }}
        >
          {person.avatar || (isAgent ? "🤖" : "👤")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{person.name}</span>
            {isAgent && person.isOrchestrator && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-medium">
                Orchestrator
              </span>
            )}
            {isAgent && person.status && (
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[person.status] || "bg-gray-500"}`} />
                <span className="text-xs text-gray-500 capitalize">{person.status}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{person.role}</p>

          {person.bio && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{person.bio}</p>
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {person.email && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                {person.email}
              </span>
            )}
            {isAgent && person.model && (
              <span className={`text-xs flex items-center gap-1 ${modelColor(person.model)}`}>
                <Cpu className="w-3 h-3" />
                {person.model}
              </span>
            )}
          </div>

          {person.skills && person.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {person.skills.slice(0, 4).map((skill) => (
                <span key={skill} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded">
                  {skill}
                </span>
              ))}
              {person.skills.length > 4 && (
                <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-600 rounded">
                  +{person.skills.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "human" | "agent">("all");

  const fetchPeople = useCallback(async () => {
    try {
      const res = await fetch("/api/people");
      const data = (await res.json()) as { people: Person[] };
      setPeople(data.people || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchPeople(); }, [fetchPeople]);

  const filtered = people.filter((p) => {
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const humanCount = people.filter((p) => p.type === "human").length;
  const agentCount = people.filter((p) => p.type === "agent").length;
  const activeCount = people.filter((p) => p.status === "active").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            People
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {humanCount} human{humanCount !== 1 ? "s" : ""} · {agentCount} agents · {activeCount} active
          </p>
        </div>
        <button onClick={fetchPeople} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-900 border border-gray-800 rounded-lg">
          {(["all", "human", "agent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                typeFilter === t ? "bg-gray-800 text-gray-100" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "human" && <User className="w-3.5 h-3.5" />}
              {t === "agent" && <Bot className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-600">No people found</div>
          )}
        </div>
      )}
    </div>
  );
}
