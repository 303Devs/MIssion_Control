import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  CalendarDays,
  CheckSquare,
  Factory,
  FileStack,
  FileText,
  FolderKanban,
  GitBranch,
  Landmark,
  Brain,
  MessageSquareMore,
  Radar,
  ServerCog,
  ShieldCheck,
  UserRoundSearch,
  Users,
} from "lucide-react";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const shellNavItems: ShellNavItem[] = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/content", label: "Content", icon: FileStack },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/council", label: "Council", icon: Landmark },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/people", label: "People", icon: Users },
  { href: "/office", label: "Office", icon: Building2 },
  { href: "/team", label: "Team", icon: UserRoundSearch },
  { href: "/system", label: "System", icon: ServerCog },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/factory", label: "Factory", icon: Factory },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/feedback", label: "Feedback", icon: MessageSquareMore },
];
