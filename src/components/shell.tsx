import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MERCHANT } from "@/lib/types";

interface ShellProps {
  children: React.ReactNode;
  className?: string;
}

export function Shell({ children, className }: ShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main
        className={cn(
          "mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-7",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

function Header() {
  return (
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
        <Nav />
      </div>
    </header>
  );
}

function Nav() {
  const router = useRouterState();
  const path = router.location.pathname;
  const linkClass = (to: string) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm transition-colors",
      path === to
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav className="flex items-center gap-1">
      <Link to="/" className={linkClass("/")}>
        งวดนี้ · This Period
      </Link>
      <Link to="/closed" className={linkClass("/closed")}>
        ปิดแล้ว · Closed
      </Link>
      <Link
        to="/add"
        className="rounded-full bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:brightness-105 transition-all"
      >
        เพิ่มสัญญา · New
      </Link>
    </nav>
  );
}