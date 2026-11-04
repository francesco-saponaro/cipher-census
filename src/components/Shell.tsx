import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { Horizon } from "@/api/client.ts";
import { longDate } from "@/format.ts";
import { cn } from "@/lib/utils.ts";

interface Props {
  horizon: Horizon;
  asOf: string;
  children: ReactNode;
}

/** The product's mark: a tally of four strokes and one across, the way a census is counted. */
function Mark() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 5v14M9 5v14M13 5v14M17 5v14" />
      <path d="M3 17l18-10" />
    </svg>
  );
}

export function Shell({ horizon, asOf, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      <Link to="/" search={{ horizon }} className="nav-item" activeOptions={{ exact: true }} activeProps={{ "aria-current": "page" }}>
        Census
      </Link>
      <Link to="/services" search={{ horizon }} className="nav-item" activeProps={{ "aria-current": "page" }}>
        Services
      </Link>
    </nav>
  );

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" search={{ horizon }} className="flex items-center gap-2 font-medium">
          <Mark />
          Cipher Census
        </Link>
        <button
          type="button"
          className="flex h-11 cursor-pointer items-center px-2 font-medium"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      <aside id="sidebar" className={cn("sidebar", open && "open")}>
        <div className="mb-6 px-2">
          <div className="flex items-center justify-between gap-2 text-ink">
            <span className="flex items-center gap-2">
              <Mark />
              <span className="text-base font-medium">Cipher Census</span>
            </span>
            <button type="button" className="sheet-close h-11 cursor-pointer px-2 font-medium" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className="mt-2 text-muted">Halden Group</p>
        </div>
        {nav}
        <div className="mt-auto px-2 text-xs text-faint">
          <p>Inventory taken {longDate(asOf)}</p>
          <p className="mt-1">Horizon set to {horizon}</p>
        </div>
      </aside>
      <main className="canvas">{children}</main>
    </div>
  );
}
