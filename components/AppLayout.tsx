"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Zap,
  Search,
  Sun,
  Moon,
  Settings,
  Activity,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMarketSnapshot } from "@/app/actions";
import { cn } from "@/lib/utils";

import { usePathname } from "next/navigation";
import Link from "next/link";
// ... imports

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState<any>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
    const fetchSnapshot = async () => {
      const data = await getMarketSnapshot();
      if (data) setSnapshot(data);
    };
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-[52px] border-b border-border bg-[var(--header-bg)] flex items-center px-6 z-50 shrink-0 transition-colors duration-200">
        {/* Logo Area */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[var(--header-text)] text-[18px] tracking-tight leading-none">
              Coinpree
            </span>
            <span className="text-[9px] font-bold text-[var(--header-subtext)] uppercase tracking-widest">
              MA Crossover Terminal
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-8 w-px bg-border mx-6" />

        {/* Navigation */}
        <div className="flex items-center gap-1 mr-6">
          <Link href="/">
            <Button
              variant={pathname === "/" ? "secondary" : "ghost"}
              className={cn(
                "h-8 text-[12px] font-bold px-3",
                pathname === "/"
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Derivatives (CG)
            </Button>
          </Link>
          <Link href="/binance-futures">
            <Button
              variant={pathname === "/binance-futures" ? "secondary" : "ghost"}
              className={cn(
                "h-8 text-[12px] font-bold px-3",
                pathname === "/binance-futures"
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Futures Market
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-[400px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--header-subtext)]"
            size={15}
          />
          <input
            placeholder="Search coins, symbols..."
            className="bg-[var(--header-search-bg)] border border-transparent rounded-lg h-9 w-full pl-9 pr-4 text-[13px] outline-none focus:border-primary/50 text-[var(--header-text)] font-medium transition-all placeholder:text-[var(--header-subtext)]"
          />
        </div>

        <div className="flex-1" />

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Stats Removed as per request */}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-[var(--header-subtext)] hover:text-[var(--header-text)] hover:bg-[var(--header-search-bg)] rounded-lg transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-[var(--header-subtext)] hover:text-[var(--header-text)] hover:bg-[var(--header-search-bg)] rounded-lg transition-colors"
          >
            <Settings size={18} />
          </Button>

          <div className="h-8 w-px bg-border mx-2" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Content Viewport */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-background scroll-smooth">
            <div className="max-w-[1600px] mx-auto">{children}</div>
          </main>

          <footer className="bg-card border-t border-border py-3 px-6 text-[10px] text-muted-foreground flex items-center justify-center shrink-0">
            <div className="flex items-center gap-4">
              <span className="font-bold">© 2026 Coinpree</span>
              <span className="opacity-50">|</span>
              <span className="font-semibold text-primary">Developed by Pushparaj M</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
