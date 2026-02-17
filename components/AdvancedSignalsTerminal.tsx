"use client";

import React, { useState, useEffect, memo, useMemo, useCallback } from "react";
import {
    Activity,
    RefreshCw,
    Search,
    Bell,
    BellOff,
    HelpCircle,
    Copy,
    Clock,
    Filter,
} from "lucide-react";
import { useAlertSystem } from "@/lib/hooks/useAlertSystem";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getAdvancedSignalsAction } from "@/app/actions";
import { TinyCandle } from "@/components/ui/sparkline";
import type { AdvancedSignal, Timeframe } from "@/lib/services/advanced-algo";

interface AdvancedSignalsTerminalProps {
    initialData?: AdvancedSignal[];
    title: string;
    description: string;
}

const EXCHANGES = [
    { id: "binance_futures", name: "Binance Futures", icon: "https://bin.bnbstatic.com/static/images/common/favicon.ico", status: 'active' },
    { id: "bybit", name: "Bybit", icon: "https://www.bybit.com/favicon.ico", status: 'active' },
    { id: "bitget", name: "Bitget", icon: "https://www.bitget.com/favicon.ico", status: 'active' },
    { id: "coinbase", name: "Coinbase", icon: "https://www.coinbase.com/favicon.ico", status: 'active' },
    { id: "okx", name: "OKX", icon: "https://www.okx.com/favicon.ico", status: 'coming_soon' },
];

const TIMEFRAMES: Timeframe[] = ["5m", "15m", "30m", "1h", "2h", "4h", "1d"];

const SignalRow = memo(({
    signal,
    idx,
    signalHistoryMap,
    onClick
}: {
    signal: AdvancedSignal,
    idx: number,
    signalHistoryMap: Record<string, { firstSeen: number, lastUpdate: number }>,
    onClick: () => void
}) => {
    const uniqueKey = `${signal.symbol}-${signal.type}`;
    const history = signalHistoryMap[uniqueKey];

    return (
        <TableRow
            className="group hover:bg-muted/40 transition-colors border-border/40 cursor-pointer text-sm"
            onClick={onClick}
        >
            <TableCell className="pl-6 py-2.5 w-[110px] min-w-[110px]">
                <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-bold text-foreground">
                        {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex flex-col text-[9px] text-muted-foreground/60">
                        {history && (
                            <div className="flex items-center gap-1.5 translate-y-[1px]">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 opacity-50" />
                                    <span>{new Date(history.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {new Date(history.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !==
                                    new Date(history.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) && (
                                        <div className="flex items-center gap-1">
                                            <RefreshCw className="w-2.5 h-2.5 opacity-50" />
                                            <span>{new Date(history.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-2.5 font-medium w-[220px] min-w-[220px]">
                <div className="flex items-center gap-3">
                    {signal.image && (
                        <img
                            src={signal.image}
                            alt={signal.symbol}
                            className="w-8 h-8 rounded-full bg-muted border border-border/50"
                        />
                    )}
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{signal.symbol}</span>
                            {signal.score >= 90 && (
                                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {signal.reason && signal.reason.map((r, i) => (
                                <span
                                    key={i}
                                    className={cn(
                                        "text-[9px] font-medium text-muted-foreground/80 bg-muted/50 px-1 rounded-[3px] whitespace-nowrap",
                                        i > 1 && "hidden 2xl:inline-block"
                                    )}
                                >
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-2.5 hidden lg:table-cell w-[130px] min-w-[130px]">
                <div className="w-[100px] h-[24px]">
                    {signal.chartData && signal.chartData.length > 0 ? (
                        <TinyCandle data={signal.chartData} width={100} height={24} />
                    ) : (
                        <div className="h-full w-full bg-muted/20 animate-pulse rounded" />
                    )}
                </div>
            </TableCell>
            <TableCell className="py-2.5 w-[90px] min-w-[90px]">
                <Badge
                    variant="outline"
                    className={cn(
                        "px-2 py-0.5 text-[10px] font-extrabold border-0 ring-1 ring-inset uppercase tracking-wider",
                        signal.type === "BUY"
                            ? "bg-green-500/10 text-green-500 ring-green-500/20"
                            : "bg-red-500/10 text-red-500 ring-red-500/20"
                    )}
                >
                    {signal.type}
                </Badge>
            </TableCell>
            <TableCell className="py-2.5 w-[160px] hidden xl:table-cell">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-bold text-foreground">{signal.score}%</span>
                    </div>
                    <Progress value={signal.score} className="h-1 bg-muted/50" />
                </div>
            </TableCell>
            <TableCell className="py-2.5 text-right w-[110px]">
                <span className="font-mono font-bold text-foreground">
                    ${signal.entryPrice < 1 ? signal.entryPrice.toFixed(6) : signal.entryPrice.toLocaleString()}
                </span>
            </TableCell>
            <TableCell className="py-2.5 text-right w-[110px] hidden xl:table-cell">
                <span className="font-mono text-red-500/90 font-medium">
                    ${signal.stopLoss < 1 ? signal.stopLoss.toFixed(6) : signal.stopLoss.toLocaleString()}
                </span>
            </TableCell>
            <TableCell className="py-2.5 text-right w-[110px]">
                <span className="font-mono text-green-500/90 font-medium">
                    ${signal.takeProfit < 1 ? signal.takeProfit.toFixed(6) : signal.takeProfit.toLocaleString()}
                </span>
            </TableCell>
            <TableCell className="py-2.5 text-center w-[80px] hidden 2xl:table-cell">
                <Badge variant="outline" className="text-[10px] font-mono border-border/50">
                    1:{signal.rrRatio.toFixed(1)}
                </Badge>
            </TableCell>
            <TableCell className="py-2.5 text-right pr-6 w-[60px]">
                <div className="flex items-center justify-end">
                    <div className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all">
                        <Copy className="h-3.5 w-3.5" />
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});

SignalRow.displayName = "SignalRow";

export default function AdvancedSignalsTerminal({
    initialData,
    title,
    description,
}: AdvancedSignalsTerminalProps) {
    const [selectedExchange, setSelectedExchange] = useState<string>("binance_futures");
    const [signals, setSignals] = useState<AdvancedSignal[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [timeframe, setTimeframe] = useState<Timeframe>("15m");
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [signalHistoryMap, setSignalHistoryMap] = useState<Record<string, { firstSeen: number, lastUpdate: number }>>({});
    const { enabled: alertsEnabled, toggleAlerts, triggerAlert } = useAlertSystem();

    const fetchSignals = async (exchangeId: string) => {
        // Initial load bypasses hidden check if it contains "-init"
        // Also allow background scanning if alerts are enabled
        if (document.hidden && !exchangeId.includes("-init") && !alertsEnabled) return;

        const cleanId = exchangeId.replace("-init", "");
        setLoading(true);
        try {
            const data = await getAdvancedSignalsAction(cleanId, timeframe);
            const now = Date.now();

            // Detect NEW signals before updating history
            if (lastUpdate && data.length > 0) {
                const firstNew = data.find(s => {
                    const key = `${s.symbol}-${s.type}`;
                    return !signalHistoryMap[key];
                });
                if (firstNew) {
                    console.log(`🔔 Advanced Alert triggering for ${firstNew.symbol}`);
                    triggerAlert(
                        `New Signal: ${firstNew.symbol}`,
                        `Advanced scan found ${firstNew.type} at $${firstNew.entryPrice.toFixed(4)}`
                    );
                }
            }

            // Sync history map efficiently
            setSignalHistoryMap(prev => {
                const next = { ...prev };
                data.forEach(s => {
                    const key = `${s.symbol}-${s.type}`;
                    next[key] = {
                        firstSeen: prev[key]?.firstSeen || s.timestamp || now,
                        lastUpdate: now
                    };
                });
                return next;
            });

            setSignals(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to fetch signals", error);
            // toast.error("Failed to update signals");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedExchange) {
            fetchSignals(selectedExchange + "-init");
            const interval = setInterval(() => fetchSignals(selectedExchange), 60000);
            return () => clearInterval(interval);
        }
    }, [selectedExchange, timeframe]);


    const filteredSignals = useMemo(() => {
        if (!searchQuery.trim()) return signals;
        const query = searchQuery.toLowerCase();
        return signals.filter((signal) =>
            signal.symbol.toLowerCase().includes(query)
        );
    }, [signals, searchQuery]);

    const stats = useMemo(() => {
        return {
            total: filteredSignals.length,
            buy: filteredSignals.filter(s => s.type === "BUY").length,
            sell: filteredSignals.filter(s => s.type === "SELL").length,
            avgScore: filteredSignals.length > 0
                ? Math.round(filteredSignals.reduce((acc, s) => acc + s.score, 0) / filteredSignals.length)
                : 0
        };
    }, [filteredSignals]);

    const copySignal = useCallback((signal: AdvancedSignal) => {
        const text = `🎯 SIGNAL: ${signal.symbol} (${signal.type})
Entry: $${signal.entryPrice}
TP: $${signal.takeProfit}
SL: $${signal.stopLoss}
Score: ${signal.score}/100`;
        navigator.clipboard.writeText(text);
        toast.success("Signal copied");
    }, []);

    return (
        <TooltipProvider>
            <div className="flex flex-col min-h-screen bg-background text-foreground space-y-4 p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto">
                <div className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Activity className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight leading-none md:text-xl">
                                        {title}
                                    </h1>
                                    <p className="text-[10px] text-muted-foreground mt-1 md:text-xs">{description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchSignals(selectedExchange + "-init")}
                                    disabled={loading}
                                    className={cn(
                                        "h-8 px-3 text-xs",
                                        loading && "opacity-80"
                                    )}
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5 md:mr-2", loading && "animate-spin")} />
                                    <span className="hidden md:inline">Refresh</span>
                                </Button>

                                <Button
                                    variant={alertsEnabled ? "default" : "outline"}
                                    size="sm"
                                    onClick={toggleAlerts}
                                    className={cn("h-8 gap-2 font-bold text-[10px]", alertsEnabled ? "bg-primary/20 text-primary border-primary/50" : "")}
                                >
                                    {alertsEnabled ? <Bell size={14} className="fill-current" /> : <BellOff size={14} />}
                                    <span className="hidden md:inline">ALERTS</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/40 w-fit">
                            {EXCHANGES.map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => ex.status === 'active' && setSelectedExchange(ex.id)}
                                    disabled={ex.status === "coming_soon"}
                                    className={cn(
                                        "flex items-center px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                                        selectedExchange === ex.id
                                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                                        ex.status === "coming_soon" && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <img
                                        src={ex.icon}
                                        className="w-3.5 h-3.5 mr-2 rounded-full"
                                        alt={ex.name}
                                    />
                                    {ex.name}
                                    {ex.status === "coming_soon" && <span className="ml-1.5 opacity-70 text-[9px] uppercase tracking-wide">Soon</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 p-3 bg-card/60 border border-border/40 rounded-xl backdrop-blur-sm shadow-sm">
                        <div className="hidden md:grid grid-cols-12 items-center gap-6">
                            <div className="col-span-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                <Input
                                    placeholder="Search details..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 bg-background/40 border-border/50 text-xs w-full focus:bg-background/80 transition-all rounded-lg"
                                />
                            </div>

                            <div className="col-span-4 flex items-center justify-center gap-1.5 p-1 bg-muted/30 rounded-lg border border-border/40 w-fit mx-auto">
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setTimeframe(tf)}
                                        className={cn(
                                            "px-4 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                                            timeframe === tf
                                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/30"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                                        )}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>

                            <div className="col-span-4 flex items-center justify-end gap-6 text-[11px] font-mono">
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground/60 uppercase tracking-tighter text-[9px]">TOTAL</span>
                                    <span className="font-bold text-foreground">{stats.total}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground/60 uppercase tracking-tighter text-[9px]">BUY/SELL</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-green-500">{stats.buy}</span>
                                        <span className="opacity-20">/</span>
                                        <span className="font-bold text-red-500">{stats.sell}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-muted-foreground/60 uppercase tracking-tighter text-[9px]">AVG SCORE</span>
                                    <span className="font-bold text-primary">{stats.avgScore}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                {loading && signals.length === 0 ? (
                                    <div className="p-8 space-y-4">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                        ))}
                                    </div>
                                ) : (
                                    <Table className="relative">
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                                            <TableRow className="border-border/40 hover:bg-transparent h-10">
                                                <TableHead className="pl-6 h-10 w-[110px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                                            Time <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Signal generation time & history</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="h-10 w-[220px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                                            Pair & Reason <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Asset and primary detection factors</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="h-10 w-[130px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                                                    Chart Preview
                                                </TableHead>
                                                <TableHead className="h-10 w-[90px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                                            Signal <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Trade direction (Buy/Sell)</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="w-[160px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden xl:table-cell text-left">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                                            Confidence <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Algo score (0-100) based on trend, RSI, volatility</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="text-right h-10 w-[110px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 justify-end cursor-help ml-auto">
                                                            Entry <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Optimal price level to open the trade</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="text-right h-10 w-[110px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 justify-end cursor-help ml-auto">
                                                            Stop Loss <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Automated exit to limit potential loss</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="text-right h-10 w-[110px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 justify-end cursor-help ml-auto">
                                                            Target <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Take profit level for this trade setup</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="text-center w-[80px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden 2xl:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger className="flex items-center gap-1 justify-center cursor-help">
                                                            R:R <HelpCircle className="h-3 w-3 opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Risk to Reward Ratio (Target / Stop Loss)</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableHead>
                                                <TableHead className="text-right w-[60px] pr-6 h-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSignals.map((signal, idx) => (
                                                <SignalRow
                                                    key={`${signal.symbol}-${signal.type}-${idx}`}
                                                    signal={signal}
                                                    idx={idx}
                                                    signalHistoryMap={signalHistoryMap}
                                                    onClick={() => copySignal(signal)}
                                                />
                                            ))}
                                            {filteredSignals.length === 0 && !loading && (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="h-64 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-3 opacity-40">
                                                            <Activity className="h-10 w-10" />
                                                            <p className="text-sm font-medium">No signals detected for {selectedExchange} on {timeframe}</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}
