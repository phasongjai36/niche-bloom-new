import { Outlet, NavLink, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MERCHANT } from "@/lib/types";

export default function ShellLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm transition-colors",
      isActive
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print border-b border-line/80 bg-card/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-card">
              <img
                src="/logo-minimal.jpg"
                alt="NB Logo"
                className="size-full object-cover"
              />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg tracking-[0.18em] text-ink">
                {MERCHANT.brand}
              </span>
              <span className="hidden text-[10px] tracking-[0.22em] text-muted-foreground sm:block">
                Invoice & Installments · บิลเงินผ่อน
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              งวดนี้ · This Period
            </NavLink>
            <NavLink to="/closed" className={linkClass}>
              ปิดแล้ว · Closed
            </NavLink>
            <NavLink
              to="/add"
              className="rounded-full bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:brightness-105 transition-all"
            >
              เพิ่มสัญญา · New
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}