"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { shellNavItems } from "@/components/shell-nav";

export default function Sidebar({ searchQuery = "" }: { searchQuery?: string }) {
  const pathname = usePathname();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const navItems = normalizedQuery
    ? shellNavItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
    : shellNavItems;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Zap className="h-4 w-4 text-gray-950" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-[0.24em] text-white">MISSION</div>
            <div className="-mt-0.5 text-xs font-mono tracking-[0.42em] text-emerald-400">CONTROL</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all duration-150 ${
                isActive
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"
                }`}
              />
              <span className="font-medium">{label}</span>
              {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 status-pulse" />}
            </Link>
          );
        })}

        {navItems.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500">
            No matching navigation items
          </div>
        )}
      </nav>

      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 status-pulse" />
          <span className="text-xs font-mono text-gray-500">SYSTEM ONLINE</span>
        </div>
      </div>
    </aside>
  );
}
