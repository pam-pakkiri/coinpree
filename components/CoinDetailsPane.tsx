"use client";

import * as React from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Globe,
  Twitter,
  MessageSquare,
  ArrowUpRight,
  Activity,
  Zap,
  BarChart3,
  Info,
  ExternalLink,
  Star,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignalData } from "./SignalsTerminal";

interface CoinDetailsPaneProps {
  coin: SignalData | null;
  open: boolean;
  onClose: () => void;
}

// --- TRADING VIEW WIDGET ---
const TradingViewWidget = ({ symbol }: { symbol: string }) => {
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!container.current) return;

    // Clear previous widget
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      allow_symbol_change: false,
      studies: ["STD;EMA", "STD;MACD"],
      container_id: "tradingview_chart",
    });

    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={container}>
      <div id="tradingview_chart" className="h-full w-full"></div>
    </div>
  );
};

export default function CoinDetailsPane({
  coin,
  open,
  onClose,
}: CoinDetailsPaneProps) {
  if (!open || !coin) return null;

  const isBuy = coin.signalType === "BUY";
  const isSell = coin.signalType === "SELL";
  const coinName = coin.name || coin.fullData?.name || coin.symbol;
  const coinImage = coin.image || coin.fullData?.image || "";

  const profitLoss =
    ((coin.currentPrice - coin.entryPrice) / coin.entryPrice) * 100;
  const isProfit = profitLoss >= 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div className="fixed right-0 top-0 h-screen w-full md:w-[800px] bg-card border-l border-border z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {coinImage ? (
                  <img
                    src={coinImage}
                    alt={coin.symbol}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    {coin.symbol.slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-foreground">
                    {coin.symbol}
                  </h2>
                  <Badge
                    className={cn(
                      "font-bold text-[10px] px-2 py-0.5 uppercase",
                      isBuy
                        ? "bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20"
                        : isSell
                          ? "bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isBuy ? "🟢 BUY" : isSell ? "🔴 SELL" : "⚪ NEUTRAL"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {coinName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-lg hover:bg-muted"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Price Summary */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="gecko-card p-4 bg-card">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  Current Price
                </p>
                <p className="text-2xl font-black text-foreground tabular-nums">
                  $
                  {coin.currentPrice < 1
                    ? coin.currentPrice.toFixed(6)
                    : coin.currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </p>
              </div>
              <div className="gecko-card p-4 bg-card">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  Entry Price
                </p>
                <p className="text-2xl font-black text-foreground tabular-nums">
                  $
                  {coin.entryPrice < 1
                    ? coin.entryPrice.toFixed(6)
                    : coin.entryPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </p>
              </div>
              <div className="gecko-card p-4 bg-card">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  P&L
                </p>
                <p
                  className={cn(
                    "text-2xl font-black tabular-nums",
                    isProfit ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {isProfit ? "+" : ""}
                  {profitLoss.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Signal Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Signal Details
            </h3>
            <div className="gecko-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  <Info size={14} />
                  Signal Type
                </div>
                <span className="text-foreground font-bold">
                  {coin.signalName}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  <BarChart3 size={14} />
                  Signal Score
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-16 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2",
                      coin.score >= 70
                        ? "bg-[#0ecb81]/5 text-[#0ecb81] border-[#0ecb81]/20"
                        : coin.score >= 50
                          ? "bg-orange-500/5 text-orange-500 border-orange-500/20"
                          : "bg-[#f6465d]/5 text-[#f6465d] border-[#f6465d]/20",
                    )}
                  >
                    {coin.score}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    /100
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  <Activity size={14} />
                  Volatility
                </div>
                <span className="text-orange-500 font-bold tabular-nums">
                  {coin.volatility.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  <Activity size={14} />
                  Detected At
                </div>
                <span className="text-foreground font-bold">
                  {new Date(coin.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* MA Formula */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              MA Crossover Analysis
            </h3>
            <div className="gecko-card p-5 space-y-4 bg-primary/5 border-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-muted-foreground uppercase">
                  EMA 7
                </span>
                <span className="text-lg font-black text-primary tabular-nums font-mono">
                  {coin.ema7?.toFixed(6) || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-muted-foreground uppercase">
                  EMA 99
                </span>
                <span className="text-lg font-black text-foreground tabular-nums font-mono">
                  {coin.ema99?.toFixed(6) || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[13px] font-bold text-muted-foreground uppercase">
                  Gap
                </span>
                <span className="text-lg font-black text-orange-500 tabular-nums">
                  {coin.crossoverStrength?.toFixed(2) || "0"}%
                </span>
              </div>
              <div className="pt-3 border-t border-primary/20">
                <p className="text-[11px] font-mono text-muted-foreground">
                  {coin.formula}
                </p>
              </div>
            </div>
          </div>

          {/* Price Targets */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Trade Levels
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="gecko-card p-5 border-l-4 border-l-[#f6465d] bg-[#f6465d]/5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                  Stop Loss
                </p>
                <p className="text-2xl font-black text-[#f6465d] tabular-nums">
                  $
                  {coin.stopLoss < 1
                    ? coin.stopLoss.toFixed(6)
                    : coin.stopLoss.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(
                    ((coin.stopLoss - coin.entryPrice) / coin.entryPrice) *
                    100
                  ).toFixed(2)}
                  % from entry
                </p>
              </div>
              <div className="gecko-card p-5 border-l-4 border-l-[#0ecb81] bg-[#0ecb81]/5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                  Take Profit
                </p>
                <p className="text-2xl font-black text-[#0ecb81] tabular-nums">
                  $
                  {coin.takeProfit < 1
                    ? coin.takeProfit.toFixed(6)
                    : coin.takeProfit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(
                    ((coin.takeProfit - coin.entryPrice) / coin.entryPrice) *
                    100
                  ).toFixed(2)}
                  % from entry
                </p>
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Market Data
            </h3>
            <div className="gecko-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  1h Change
                </div>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    coin.change1h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {coin.change1h >= 0 ? "+" : ""}
                  {coin.change1h.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  24h Change
                </div>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    coin.change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {coin.change24h >= 0 ? "+" : ""}
                  {coin.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  7d Change
                </div>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    coin.change7d >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {coin.change7d >= 0 ? "+" : ""}
                  {coin.change7d.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  24h Volume
                </div>
                <span className="text-foreground font-bold tabular-nums">
                  ${coin.volume24h ? (coin.volume24h / 1e6).toFixed(2) : "0.00"}
                  M
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] font-semibold">
                  Market Cap
                </div>
                <span className="text-foreground font-bold tabular-nums">
                  ${coin.marketCap ? (coin.marketCap / 1e9).toFixed(2) : "0.00"}
                  B
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Price Chart
            </h3>
            <div
              className="gecko-card overflow-hidden"
              style={{ height: "500px" }}
            >
              <TradingViewWidget symbol={coin.symbol} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold">
              <Star size={16} className="mr-2" />
              Add to Watchlist
            </Button>
            <Button variant="outline" className="flex-1 h-11 font-bold">
              <Bell size={16} className="mr-2" />
              Set Alert
            </Button>
          </div>

          {/* External Links */}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" asChild>
              <a
                href={`https://www.coingecko.com/en/coins/${coin.coinId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe size={14} className="mr-2" />
                CoinGecko
                <ExternalLink size={12} className="ml-1" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" asChild>
              <a
                href={`https://www.tradingview.com/symbols/${coin.symbol}USDT/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BarChart3 size={14} className="mr-2" />
                TradingView
                <ExternalLink size={12} className="ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
