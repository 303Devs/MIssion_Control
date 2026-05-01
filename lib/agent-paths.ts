import path from "path";

export const HOME_DIR = process.env.HOME || "/Users/anthony";
export const AGENTS_ROOT = process.env.MISSION_CONTROL_AGENTS_ROOT || path.join(HOME_DIR, "Agents");

export const OPENCLAW_ROOT =
  process.env.MISSION_CONTROL_OPENCLAW_ROOT || path.join(AGENTS_ROOT, ".openclaw");
export const HERMES_ROOT =
  process.env.MISSION_CONTROL_HERMES_ROOT || path.join(AGENTS_ROOT, ".hermes");
export const AGENT_MEMORY_VAULT =
  process.env.MISSION_CONTROL_VAULT_ROOT || path.join(AGENTS_ROOT, "Agent Memory Vault");

export const OPENCLAW_WORKSPACE = path.join(OPENCLAW_ROOT, "workspace");
export const OPENCLAW_SESSIONS_FILE = path.join(
  OPENCLAW_ROOT,
  "agents/main/sessions/sessions.json",
);
export const OPENCLAW_CRON_FILE = path.join(OPENCLAW_ROOT, "cron/jobs.json");

export const HERMES_SESSIONS_DIR = path.join(HERMES_ROOT, "sessions");
export const SHARED_HANDOFFS_FILE = path.join(
  AGENT_MEMORY_VAULT,
  "Agent-Shared/handoffs.md",
);
