"use client";

import React, { useEffect, useState, memo, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { getShortReversalSignalsAction } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    RefreshCw,
    TrendingDown,
    AlertCircle,
    Copy,
    Activity,
    Search,
    Clock,
    HelpCircle,
    Bell,
    BellOff
} from "lucide-react";
import { useAlertSystem } from "@/lib/hooks/useAlertSystem";
import { TinyCandle } from "@/components/ui/sparkline";
import { toast } from "sonner";
import { ShortReversalSignal } from "@/lib/services/short-reversal";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const TIMEFRAMES = ["15m", "30m", "1h", "4h", "1d"] as const;
type Timeframe = typeof TIMEFRAMES[number];

const SignalRow = memo(({ signal, history, onClick }: { signal: ShortReversalSignal, history?: { firstSeen: number, lastUpdate: number }, onClick: () => void }) => (
    <TableRow
        className="group hover:bg-muted/40 transition-colors border-border/40 cursor-pointer text-sm"
        onClick={onClick}
    >
        <TableCell className="pl-6 py-2.5">
            <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-muted-foreground">
                    {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex flex-col text-[9px] text-muted-foreground/60">
                    {history && (
                        <>
                            <div className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 opacity-50" />
                                First: {new Date(history.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {new Date(history.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !==
                                new Date(history.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) && (
                                    <div className="flex items-center gap-1">
                                        <RefreshCw className="w-2.5 h-2.5 opacity-50" />
                                        Update: {new Date(history.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                        </>
                    )}
                </div>
            </div>
        </TableCell>
        <TableCell className="py-2.5">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img
                        src={signal.image}
                        alt={signal.name}
                        className="w-8 h-8 rounded-full bg-muted border border-border/50"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        <TrendingDown className="w-3 h-3 text-red-500" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">{signal.symbol}</span>
                        {signal.exchange && (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 border-border/40 font-normal text-muted-foreground uppercase">
                                {signal.exchange.replace("_", " ")}
                            </Badge>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">{signal.name}</span>
                </div>
            </div>
        </TableCell>
        <TableCell className="py-2.5 hidden lg:table-cell">
            <div className="w-[100px] h-[24px]">
                {signal.chartData && signal.chartData.length > 0 ? (
                    <TinyCandle data={signal.chartData} width={100} height={24} />
                ) : (
                    <div className="h-full w-full bg-muted/20 animate-pulse rounded" />
                )}
            </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell py-2.5">
            <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit font-bold border-purple-500/20 bg-purple-500/10 text-purple-500 text-[10px] px-1.5 py-0">
                    Liquidity Sweep
                </Badge>
                <span className="text-[10px] text-muted-foreground pl-0.5">
                    {signal.exhaustionCandle.upperWickPct.toFixed(0)}% Rejection
                </span>
            </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell py-2.5">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn(
                        "text-[9px] font-bold px-1 py-0 border-0",
                        signal.metrics.ema50 < signal.metrics.ema200 ? "text-red-500 bg-red-500/10" : "text-green-500 bg-green-500/10"
                    )}>
                        {signal.metrics.ema50 < signal.metrics.ema200 ? "BEARISH" : "BULLISH"}
                    </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground pl-0.5">
                    EMA 50/200 Trend
                </span>
            </div>
        </TableCell>
        <TableCell className="py-2.5">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-foreground">
                    <Activity className="w-3 h-3 text-orange-500" />
                    {signal.metrics.volRatio.toFixed(1)}x Vol
                </div>
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-orange-500"
                        style={{ width: `${Math.min(100, signal.metrics.volRatio * 20)}%` }}
                    />
                </div>
            </div>
        </TableCell>
        <TableCell className="text-right py-2.5">
            <span className="font-mono font-bold text-foreground">${signal.entryPrice.toLocaleString()}</span>
        </TableCell>
        <TableCell className="text-right hidden xl:table-cell py-2.5">
            <span className="font-mono text-red-500/80">${signal.stopLoss.toLocaleString()}</span>
        </TableCell>
        <TableCell className="text-right hidden xl:table-cell py-2.5">
            <span className="font-mono text-green-500/80">${signal.takeProfit.toLocaleString()}</span>
        </TableCell>
        <TableCell className="text-center py-2.5">
            <Badge className={cn(
                "text-[10px] font-bold",
                signal.setup === "CONFIRMED" ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"
            )}>
                {signal.setup}
            </Badge>
        </TableCell>
        <TableCell className="text-right pr-6 py-2.5">
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
            >
                <Copy className="h-4 w-4" />
            </Button>
        </TableCell>
    </TableRow>
));

SignalRow.displayName = "SignalRow";

export default function ShortReversalPage() {
    const [signals, setSignals] = useState<ShortReversalSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [timeframe, setTimeframe] = useState<Timeframe>("1d");
    const [searchQuery, setSearchQuery] = useState("");
    const [signalHistoryMap, setSignalHistoryMap] = useState<Record<string, { firstSeen: number, lastUpdate: number }>>({});
    const { enabled: alertsEnabled, toggleAlerts, triggerAlert } = useAlertSystem();

    const fetchSignals = async (bypassHidden = false) => {
        if (document.hidden && !bypassHidden && !alertsEnabled) return;
        setLoading(true);
        try {
            const data = await getShortReversalSignalsAction(timeframe);
            const now = Date.now();

            // Detect NEW signals
            if (lastUpdate && data.length > 0) {
                const firstNew = data.find(s => !signalHistoryMap[s.symbol]);
                if (firstNew) {
                    console.log(`🔔 Short Alert for ${firstNew.symbol}`);
                    triggerAlert(
                        `Short Setup: ${firstNew.symbol}`,
                        `Potential reversal detected at $${firstNew.entryPrice.toFixed(2)}`
                    );
                }
            }

            setSignalHistoryMap(prev => {
                const next = { ...prev };
                data.forEach(s => {
                    next[s.symbol] = {
                        firstSeen: prev[s.symbol]?.firstSeen || s.timestamp || now,
                        lastUpdate: now
                    };
                });
                return next;
            });

            setSignals(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to fetch signals", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSignals(true);
        const interval = setInterval(() => fetchSignals(false), 60000);
        return () => clearInterval(interval);
    }, [timeframe]);

    const filteredSignals = useMemo(() => {
        if (!searchQuery.trim()) return signals;
        const query = searchQuery.toLowerCase();
        return signals.filter(s =>
            s.symbol.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query)
        );
    }, [signals, searchQuery]);

    const copySignal = useCallback((signal: ShortReversalSignal) => {
        const text = `🎯 SHORT SETUP: ${signal.symbol}
Entry: $${signal.entryPrice}
TP: $${signal.takeProfit}
SL: $${signal.stopLoss}
Rejection: ${signal.exhaustionCandle.upperWickPct.toFixed(0)}%`;
        navigator.clipboard.writeText(text);
        toast.success("Signal copied");
    }, []);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-1 mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Bear Watch</h1>
                <p className="text-sm text-muted-foreground">Detecting short reversal setups across major exchanges</p>
            </div>

            <TooltipProvider>
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search coins..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 bg-card/40 border-border/40"
                                />
                            </div>
                            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/40">
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setTimeframe(tf)}
                                        className={cn(
                                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase",
                                            timeframe === tf
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchSignals(true)}
                                disabled={loading}
                                className="h-9 gap-2"
                            >
                                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                                <span>Refresh</span>
                            </Button>

                            <Button
                                variant={alertsEnabled ? "default" : "outline"}
                                size="sm"
                                onClick={toggleAlerts}
                                className={cn("h-9 gap-2 font-bold", alertsEnabled ? "bg-primary/20 text-primary border-primary/50" : "")}
                            >
                                {alertsEnabled ? <Bell size={16} className="fill-current" /> : <BellOff size={16} />}
                                <span>ALERTS</span>
                            </Button>
                        </div>
                    </div>

                    <Card className="border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border/40 hover:bg-transparent">
                                            <TableHead className="pl-6 h-10 w-[110px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <Tooltip>
                                                    <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                                        Time <HelpCircle className="h-3 w-3 opacity-50" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>Detection and update status</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableHead>
                                            <TableHead className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <Tooltip>
                                                    <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                                        Asset <HelpCircle className="h-3 w-3 opacity-50" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>Trading pair and exchange platform</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableHead>
                                            <TableHead className="w-[120px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                                                Chart
                                            </TableHead>
                                            <TableHead className="hidden lg:table-cell h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Structure
                                            </TableHead>
                                            <TableHead className="hidden lg:table-cell h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Trend
                                            </TableHead>
                                            <TableHead className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Volume
                                            </TableHead>
                                            <TableHead className="text-right h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Entry
                                            </TableHead>
                                            <TableHead className="text-right hidden xl:table-cell h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Stop Loss
                                            </TableHead>
                                            <TableHead className="text-right hidden xl:table-cell h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Target
                                            </TableHead>
                                            <TableHead className="text-center h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Status
                                            </TableHead>
                                            <TableHead className="w-[80px] pr-6 h-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading && signals.length === 0 ? (
                                            [...Array(5)].map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell colSpan={11} className="p-4">
                                                        <Skeleton className="h-12 w-full" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            filteredSignals.map((signal) => (
                                                <SignalRow
                                                    key={signal.symbol}
                                                    signal={signal}
                                                    history={signalHistoryMap[signal.symbol]}
                                                    onClick={() => copySignal(signal)}
                                                />
                                            ))
                                        )}
                                        {!loading && filteredSignals.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={11} className="h-64 text-center opacity-40">
                                                    <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                                                    <p>No reversal setups found on {timeframe}</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        </div>
    );
}
