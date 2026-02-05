"use client";

import * as React from "react";
import Link from "next/link";
import { useState, useEffect, memo, useMemo } from "react";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  ExternalLink,
  Search,
  ChevronRight,
  ArrowUpRight,
  Trophy,
  Target,
  AlertTriangle,
  Calculator,
  Shield,
  Flame,
  PlusCircle,
  Filter,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import CoinDetailsPane from "./CoinDetailsPane";
import { getMACrossoverSignals } from "@/app/actions";

// --- DATA TYPE ---
export interface SignalData {
  coinId: string;
  symbol: string;
  signalType: "BUY" | "SELL" | "NEUTRAL";
  signalName: string;
  timeframe?: string;
  score: number;
  price: number;
  currentPrice: number;
  change1h: number;
  change24h: number;
  change7d: number;
  volume24h?: number;
  marketCap?: number;
  timestamp: number;
  crossoverTimestamp?: number;
  candlesAgo?: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  volatility: number;
  formula: string;
  ema7?: number;
  ema99?: number;
  ema7Prev?: number;
  ema99Prev?: number;
  crossoverStrength?: number;
  fullData?: {
    name: string;
    image: string;
  };
  name?: string;
  image?: string;
}

const FormatPercent = ({ val }: { val: number }) => {
  const v = val || 0;
  const isUp = v >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold text-[13px] tabular-nums",
        isUp ? "text-[#0ecb81]" : "text-[#f6465d]",
      )}
    >
      {isUp ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
    </span>
  );
};

// --- ROW COMPONENT ---
const SignalRow = memo(
  ({
    coin,
    index,
    onSelect,
    isNew = false,
  }: {
    coin: SignalData;
    index: number;
    onSelect: (c: SignalData) => void;
    isNew?: boolean;
  }) => {
    const isBuy = coin.signalType === "BUY";
    const isSell = coin.signalType === "SELL";
    const displayPrice = coin.currentPrice || coin.price || 0;
    const entryTime = new Date(coin.timestamp || Date.now()).toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" },
    );
    const coinName = coin.name || coin.fullData?.name || coin.symbol;
    const coinImage = coin.image || coin.fullData?.image || "";

    return (
      <TableRow
        className={cn(
          "gecko-table-row group cursor-pointer",
          isNew && "animate-pulse bg-primary/5"
        )}
        onClick={() => onSelect(coin)}
      >
        <TableCell className="w-10 text-center text-muted-foreground text-[11px] font-bold">
          {index + 1}
        </TableCell>
        <TableCell className="min-w-[280px] py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
              {coinImage ? (
                <img
                  src={coinImage}
                  alt={coin.symbol}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {coin.symbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[14px] text-foreground group-hover:text-primary transition-colors">
                  {coin.symbol}
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4 font-bold border-border/50"
                >
                  #{index + 1}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {coinName}
              </span>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge
              className={cn(
                "font-bold text-[10px] px-2 py-0.5 uppercase tracking-wide w-fit",
                isBuy
                  ? "bg-[#0ecb81]/10 text-[#0ecb81] hover:bg-[#0ecb81]/20 border-[#0ecb81]/20"
                  : isSell
                    ? "bg-[#f6465d]/10 text-[#f6465d] hover:bg-[#f6465d]/20 border-[#f6465d]/20"
                    : "bg-muted text-muted-foreground border-border",
              )}
            >
              {isBuy ? "🟢 BUY" : isSell ? "🔴 SELL" : "⚪ NEUTRAL"}
            </Badge>
            {coin.candlesAgo !== undefined && (
              <span className="text-[9px] text-muted-foreground font-medium">
                {coin.candlesAgo === 0
                  ? "FRESH!"
                  : `${coin.candlesAgo} candle${coin.candlesAgo > 1 ? "s" : ""} ago`}
              </span>
            )}
          </div>
        </TableCell>

        <TableCell>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-foreground">
              {coin.signalName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {entryTime}
            </span>
          </div>
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border-2",
                coin.score >= 70
                  ? "bg-[#0ecb81]/5 text-[#0ecb81] border-[#0ecb81]/20"
                  : coin.score >= 50
                    ? "bg-orange-500/5 text-orange-500 border-orange-500/20"
                    : "bg-[#f6465d]/5 text-[#f6465d] border-[#f6465d]/20",
              )}
            >
              {coin.score}
            </div>
            <div className="flex flex-col text-[10px]">
              <span className="text-muted-foreground font-medium">SIGNAL</span>
              <span className="text-muted-foreground font-medium">SCORE</span>
            </div>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[14px] font-bold text-foreground tabular-nums">
              $
              {displayPrice < 1
                ? displayPrice.toFixed(6)
                : displayPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </span>
            <div className="flex gap-2 text-[11px]">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger>
                    <FormatPercent val={coin.change1h} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] font-bold">
                    1h Change
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <FormatPercent val={coin.change24h} />
            <span className="text-[10px] text-muted-foreground font-medium">
              24h
            </span>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <FormatPercent val={coin.change7d} />
            <span className="text-[10px] text-muted-foreground font-medium">
              7d
            </span>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[13px] font-bold text-foreground tabular-nums">
              ${coin.volume24h ? (coin.volume24h / 1e6).toFixed(2) : "0.00"}M
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Volume
            </span>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[13px] font-bold text-foreground tabular-nums">
              ${coin.marketCap ? (coin.marketCap / 1e9).toFixed(2) : "0.00"}B
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              MCap
            </span>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[13px] font-bold text-orange-500 tabular-nums">
              {coin.volatility.toFixed(2)}%
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Vol
            </span>
          </div>
        </TableCell>

        <TableCell className="text-right">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[11px] font-mono text-primary font-bold">
                    EMA7: {coin.ema7?.toFixed(4) || "N/A"}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground font-bold">
                    EMA99: {coin.ema99?.toFixed(4) || "N/A"}
                  </span>
                  <span className="text-[10px] font-mono text-orange-500 font-bold">
                    Gap: {coin.crossoverStrength?.toFixed(2) || "0"}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="text-[11px] font-mono max-w-xs"
              >
                <div className="space-y-1">
                  <p className="font-bold">MA Crossover Formula:</p>
                  <p className="text-muted-foreground">{coin.formula}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>

        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          >
            <ChevronRight size={16} />
          </Button>
        </TableCell>
      </TableRow>
    );
  },
);

SignalRow.displayName = "SignalRow";

const BentoHeader = ({ signals }: { signals: SignalData[] }) => {
  const buySignals = signals.filter((s) => s.signalType === "BUY").length;
  const sellSignals = signals.filter((s) => s.signalType === "SELL").length;
  const avgScore =
    signals.length > 0
      ? Math.round(
        signals.reduce((sum, s) => sum + s.score, 0) / signals.length,
      )
      : 0;
  const topGainer =
    signals.length > 0
      ? signals.reduce(
        (max, s) => (s.change24h > max.change24h ? s : max),
        signals[0],
      )
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="gecko-card p-4 border-l-4 border-l-[#0ecb81] bg-[#0ecb81]/5">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="text-[#0ecb81]" size={20} />
          <Badge className="bg-[#0ecb81]/20 text-[#0ecb81] text-[10px] font-bold">
            BULLISH
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-[#0ecb81]">{buySignals}</p>
          <p className="text-[11px] font-bold text-muted-foreground uppercase">
            Buy Signals Detected
          </p>
        </div>
      </div>

      <div className="gecko-card p-4 border-l-4 border-l-[#f6465d] bg-[#f6465d]/5">
        <div className="flex items-center justify-between mb-2">
          <TrendingDown className="text-[#f6465d]" size={20} />
          <Badge className="bg-[#f6465d]/20 text-[#f6465d] text-[10px] font-bold">
            BEARISH
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-[#f6465d]">{sellSignals}</p>
          <p className="text-[11px] font-bold text-muted-foreground uppercase">
            Sell Signals Detected
          </p>
        </div>
      </div>

      <div className="gecko-card p-4 border-l-4 border-l-primary bg-primary/5">
        <div className="flex items-center justify-between mb-2">
          <Calculator className="text-primary" size={20} />
          <Badge className="bg-primary/20 text-primary text-[10px] font-bold">
            AVG SCORE
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-primary">{avgScore}</p>
          <p className="text-[11px] font-bold text-muted-foreground uppercase">
            Average Signal Score
          </p>
        </div>
      </div>

      <div className="gecko-card p-4 border-l-4 border-l-orange-500 bg-orange-500/5">
        <div className="flex items-center justify-between mb-2">
          <Trophy className="text-orange-500" size={20} />
          <Badge className="bg-orange-500/20 text-orange-500 text-[10px] font-bold">
            TOP
          </Badge>
        </div>
        <div className="space-y-1">
          {topGainer ? (
            <>
              <p className="text-xl font-black text-orange-500">
                {topGainer.symbol}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                +{topGainer.change24h.toFixed(2)}% (24h)
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-black text-orange-500">N/A</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                No Data
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function SignalsTerminal({
  title,
  description,
  fetchAction,
}: {
  title: string;
  description: string;
  fetchAction?: (timeframe?: string) => Promise<SignalData[]>;
}) {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<SignalData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(new Set());

  // Timeframe
  const [timeframe, setTimeframe] = useState("1h");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeframe]);

  const fetchData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const action = fetchAction || getMACrossoverSignals;
      // @ts-ignore - Dynamic dispatch
      const newData = await action(timeframe);

      if (!Array.isArray(newData)) {
        console.warn("Invalid data received:", newData);
        return;
      }

      setSignals((prevSignals) => {
        if (isInitialLoad) {
          // Initial load: replace all
          return newData;
        }

        // Incremental update: only add NEW signals
        const existingIds = new Set(
          prevSignals.map((s) => `${s.coinId}-${s.signalType}-${s.candlesAgo}`)
        );

        const truelyNewSignals = newData.filter(
          (newSig) =>
            !existingIds.has(`${newSig.coinId}-${newSig.signalType}-${newSig.candlesAgo}`)
        );

        if (truelyNewSignals.length > 0) {
          console.log(`🆕 ${truelyNewSignals.length} new signals detected!`, truelyNewSignals.map(s => s.symbol));

          // Mark these signals as new
          const newIds = new Set(truelyNewSignals.map(s => `${s.coinId}-${s.timestamp}`));
          setNewSignalIds(newIds);

          // Clear the "new" marker after 5 seconds
          setTimeout(() => {
            setNewSignalIds(new Set());
          }, 5000);

          // Add new signals to the TOP (most recent first)
          return [...truelyNewSignals, ...prevSignals];
        }

        // No new signals, return existing
        return prevSignals;
      });

      setLastUpdate(new Date());
    } catch (err) {
      console.warn("Error fetching signals:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true); // Initial load
    const interval = setInterval(() => fetchData(false), 15000); // Check for new signals every 15 seconds
    return () => clearInterval(interval);
  }, [timeframe]); // Refetch when timeframe changes

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const filteredSignals = useMemo(() => {
    return signals.filter(
      (s) =>
        s.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.fullData?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [signals, searchQuery]);

  // Calculate pagination derived state
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSignals
    ? filteredSignals.slice(indexOfFirstItem, indexOfLastItem)
    : [];
  const totalPages = filteredSignals
    ? Math.ceil(filteredSignals.length / itemsPerPage)
    : 0;

  const handleSelectCoin = (coin: SignalData) => {
    setSelectedCoin(coin);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">
              {title}
            </h1>
            <p className="text-[12px] font-bold text-muted-foreground uppercase opacity-80">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1 border border-border">
              {["5m", "15m", "30m", "1h", "4h", "1d"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                    timeframe === tf
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {refreshing ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Checking for new signals...
                  </span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Live • Updated: {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 gap-2"
            >
              <RefreshCw
                size={14}
                className={cn(refreshing && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      </div>

      <BentoHeader signals={signals} />

      <div className="gecko-card flex flex-col md:flex-row items-center justify-between p-3 gap-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/60 p-1 rounded-lg border border-border">
            {["15m", "1h", "4h", "1d"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                disabled={loading || refreshing}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all",
                  timeframe === tf
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  (loading || refreshing) && "opacity-50 cursor-not-allowed",
                )}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-auto md:min-w-[300px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by symbol or name..."
            className="h-9 w-full pl-9 pr-4 rounded-lg border border-border bg-background text-[13px] font-medium outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
          <Activity size={14} />
          <span>{filteredSignals.length} Signals</span>
        </div>
      </div>

      <div className="gecko-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 w-full" />
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <div className="ml-auto space-y-2">
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="text-muted-foreground" size={40} />
              <p className="text-sm font-bold text-muted-foreground">
                {searchQuery
                  ? "No signals match your search"
                  : "No signals detected"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="gecko-table-header">
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="min-w-[280px]">Coin</TableHead>
                    <TableHead>Signal & Timing</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">24h</TableHead>
                    <TableHead className="text-right">7d</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Market Cap</TableHead>
                    <TableHead className="text-right">Volatility</TableHead>
                    <TableHead className="text-right">MA Formula</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((coin, idx) => {
                    const signalKey = `${coin.coinId}-${coin.timestamp}`;
                    const isNew = newSignalIds.has(signalKey);

                    return (
                      <SignalRow
                        key={signalKey}
                        coin={coin}
                        index={indexOfFirstItem + idx}
                        onSelect={handleSelectCoin}
                        isNew={isNew}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="text-[11px] font-bold text-muted-foreground">
                Showing {indexOfFirstItem + 1}-
                {Math.min(indexOfLastItem, filteredSignals.length)} of{" "}
                {filteredSignals.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  &lt;
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      p = currentPage - 3 + i;
                      if (p > totalPages) p = totalPages - (4 - i);
                    }
                    return (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "h-8 w-8 p-0 text-[11px] font-bold",
                          currentPage === p ? "bg-primary text-white" : "",
                        )}
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  &gt;
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedCoin && (
        <CoinDetailsPane
          coin={selectedCoin}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  );
}

export default SignalsTerminal;
