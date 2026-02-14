"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getShortReversalSignalsAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    ArrowDown,
    RefreshCw,
    TrendingDown,
    AlertCircle,
    Copy
} from "lucide-react";
import { toast } from "sonner";
import { ShortReversalSignal } from "@/lib/services/short-reversal";

export default function ShortReversalPage() {
    const [signals, setSignals] = useState<ShortReversalSignal[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSignals = async () => {
        setLoading(true);
        try {
            const data = await getShortReversalSignalsAction();
            setSignals(data);
        } catch (error) {
            console.error("Failed to fetch signals", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSignals();
        // Refresh every 1 minute
        const interval = setInterval(fetchSignals, 60000);
        return () => clearInterval(interval);
    }, []);

    const copySignal = (signal: ShortReversalSignal) => {
        const text = `🚨 SHORT REVERSAL: ${signal.symbol}
Entry: $${signal.entryPrice.toFixed(4)} (Break of Low)
SL: $${signal.stopLoss.toFixed(4)}
TP: $${signal.takeProfit.toFixed(4)}
Status: ${signal.setup}
Vol Ratio: ${signal.metrics.volRatio.toFixed(1)}x`;
        navigator.clipboard.writeText(text);
        toast.success("Signal copied to clipboard");
    };

    return (
        <div className="flex flex-col h-full bg-background/95">
            <div className="flex items-center justify-between p-6 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <TrendingDown className="w-6 h-6 text-red-500" />
                        Short Reversal Scanner
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Detecting exhaustion candles in downtrends/weak trends (Daily Timeframe)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSignals}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-6">
                {signals.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p>No Reversal setups found right now.</p>
                        <p className="text-sm">Market might be strong or consolidating.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Stats Cards */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Signals</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{signals.length}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed Breakdowns</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-500">
                                        {signals.filter(s => s.setup === 'CONFIRMED').length}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Potential Setups</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-500">
                                        {signals.filter(s => s.setup === 'POTENTIAL').length}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Active Signals</CardTitle>
                                <CardDescription>
                                    Candidates showing exhaustion candle (High Volume, Long Wick) in bearish context.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Asset</TableHead>
                                            <TableHead>Structure</TableHead>
                                            <TableHead>Exhaustion Metrics</TableHead>
                                            <TableHead>Entry (Break Low)</TableHead>
                                            <TableHead>Stop Loss</TableHead>
                                            <TableHead>Target (2R)</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {signals.map((signal) => (
                                            <TableRow key={signal.coinId}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <img src={signal.image} alt={signal.name} className="w-8 h-8 rounded-full" />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{signal.symbol}</span>
                                                            <span className="text-xs text-muted-foreground">{signal.name}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <span className={signal.price < signal.metrics.ema200 ? "text-green-500" : "text-yellow-500"}>
                                                            {signal.price < signal.metrics.ema200 ? "Below EMA200" : "Above EMA200"}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            Vol: {signal.metrics.volRatio.toFixed(1)}x Avg
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <span title="Upper Wick % of Range">
                                                            🕯️ Wick: {signal.exhaustionCandle.upperWickPct.toFixed(0)}%
                                                        </span>
                                                        <span title="Move Size">
                                                            📈 Move: +{signal.exhaustionCandle.movePct.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono font-medium text-red-500">
                                                    ${signal.entryPrice.toFixed(signal.entryPrice < 1 ? 6 : 2)}
                                                </TableCell>
                                                <TableCell className="font-mono text-muted-foreground">
                                                    ${signal.stopLoss.toFixed(signal.stopLoss < 1 ? 6 : 2)}
                                                </TableCell>
                                                <TableCell className="font-mono text-green-500">
                                                    ${signal.takeProfit.toFixed(signal.takeProfit < 1 ? 6 : 2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={signal.setup === 'CONFIRMED' ? 'destructive' : 'outline'} className="uppercase">
                                                        {signal.setup}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => copySignal(signal)}>
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
