"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 8.5 10 3l7 5.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V8.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/vault",
    label: "Vault",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
        <path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h3.6l1.6 1.8H16A1.5 1.5 0 0 1 17.5 7.8V14A1.5 1.5 0 0 1 16 15.5H4A1.5 1.5 0 0 1 2.5 14V6Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/boards",
    label: "Boards",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: "/agentic-workflow",
    label: "Agentic Workflow",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="7" width="12" height="9" rx="2" />
        <path d="M10 7V4.5M8 11.5h.01M12 11.5h.01M2.5 11v2M17.5 11v2" strokeLinecap="round" />
        <circle cx="10" cy="3.5" r="1" />
      </svg>
    ),
  },
];

const ADMIN_ITEMS = [
  {
    href: "/enterprise-data",
    label: "Enterprise Data",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.5 17.5v-11l4-3 4 3v11M11.5 17.5h5v-7h-5M3.5 17.5h13" strokeLinejoin="round" />
        <path d="M6.5 9.5h1M6.5 12.5h1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/user-management",
    label: "User Management",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7.5" cy="7" r="2.5" />
        <path d="M2.5 16a5 5 0 0 1 10 0M13 4.8a2.5 2.5 0 0 1 0 4.4M14.5 11.6a5 5 0 0 1 3 4.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/agentic-workflow",
    label: "Agentic Workflow",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="7" width="12" height="9" rx="2" />
        <path d="M10 7V4.5M8 11.5h.01M12 11.5h.01M2.5 11v2M17.5 11v2" strokeLinecap="round" />
        <circle cx="10" cy="3.5" r="1" />
      </svg>
    ),
  },
];

const RECENT_CHATS = [
  "Q2 Profit & Loss Summary",
  "Balance Sheet Breakdown",
  "Quarterly Financial Analysis",
  "Year-End Financial Overview",
  "Expense Trend Analysis...",
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col bg-surface border-r border-border px-5 py-6">
      <Link href="/boards" className="flex items-center gap-2.5 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-deep text-white">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M10 1.5 12 8l6.5 2L12 12l-2 6.5L8 12 1.5 10 8 8l2-6.5Z" />
          </svg>
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">
          LedgerLM
        </span>
      </Link>

      <label className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-muted focus-within:border-primary">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Search for chats..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <nav className="mt-5 flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as "/boards"}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-colors ${
                active
                  ? "border border-primary/60 bg-accent-soft font-semibold text-primary-deep shadow-sm"
                  : "text-foreground/80 hover:bg-accent-soft/60"
              }`}
            >
              <span className={active ? "text-primary-deep" : "text-muted"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 px-1">
        <h3 className="font-display text-[15px] font-semibold">Admin</h3>
        <nav className="mt-2 flex flex-col gap-1">
          {ADMIN_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href as "/boards"}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-[15px] text-foreground/80 hover:bg-accent-soft/60"
            >
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 px-1">
        <h3 className="font-display text-[15px] font-semibold">Recent Chats</h3>
        <ul className="mt-3 space-y-2.5">
          {RECENT_CHATS.map((chat) => (
            <li key={chat}>
              <span className="block cursor-default truncate text-[13px] text-muted hover:text-foreground">
                {chat}
              </span>
            </li>
          ))}
        </ul>
        <button className="mt-3 text-[13px] font-medium text-accent hover:underline">
          View All →
        </button>
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <Link
          href="/boards"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          New Analysis
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
        </Link>
        <button className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
          <span className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-white">
              G
            </span>
            <span className="text-[15px] font-medium">gajendramohan</span>
          </span>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted" stroke="currentColor" strokeWidth="1.6">
            <path d="m7 8 3-3 3 3M7 12l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
