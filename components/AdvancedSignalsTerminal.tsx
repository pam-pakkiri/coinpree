"use client";

import { useEffect, useState, useMemo } from "react";
import {
    RefreshCw,
    Search,
    Activity,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAdvancedSignalsAction } from "@/app/actions";
import { AdvancedSignal } from "@/lib/services/advanced-algo";

interface AdvancedSignalsTerminalProps {
    initialData: AdvancedSignal[];
    title: string;
    description: string;
}

type Exchange = {
    id: string;
    name: string;
    type: "CEX" | "DEX";
    status: "active" | "coming_soon";
};

const EXCHANGES: Exchange[] = [
    { id: "binance_futures", name: "Binance Futures", type: "CEX", status: "active" },
    { id: "coinbase", name: "Coinbase Spot", type: "CEX", status: "active" },
    { id: "coinbase_intl", name: "Coinbase Intl", type: "CEX", status: "active" },
    { id: "bybit_linear", name: "Bybit Linear", type: "CEX", status: "coming_soon" },
];

export default function AdvancedSignalsTerminal({
    initialData,
    title,
    description,
}: AdvancedSignalsTerminalProps) {
    const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
    const [signals, setSignals] = useState<AdvancedSignal[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    type Timeframe = "15m" | "1h" | "4h" | "1d";
    const [timeframe, setTimeframe] = useState<Timeframe>("15m");

    const fetchSignals = async (exchangeId: string) => {
        setLoading(true);
        setSignals([]);
        try {
            if (exchangeId === "binance_futures" || exchangeId === "coinbase" || exchangeId === "coinbase_intl") {
                const data = await getAdvancedSignalsAction(exchangeId, timeframe);
                setSignals(data);
            }
        } catch (error) {
            console.error("Failed to fetch signals", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedExchange) {
            fetchSignals(selectedExchange);
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

    return (
        <div className="flex h-screen flex-col">
            <div className="border-b bg-background/95 supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center px-4 gap-4">
                    <Activity className="h-5 w-5" />
                    <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <div className="ml-auto flex items-center gap-2">
                        {selectedExchange && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedExchange && fetchSignals(selectedExchange)}
                                disabled={loading}
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                                Refresh
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6">
                    {!selectedExchange ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {EXCHANGES.map((exchange) => (
                                <Card
                                    key={exchange.id}
                                    className={cn(
                                        "cursor-pointer transition-all hover:shadow-md",
                                        exchange.status === "coming_soon" && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => exchange.status === "active" && setSelectedExchange(exchange.id)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex flex-col gap-2">
                                            <h3 className="font-semibold text-lg">{exchange.name}</h3>
                                            <p className="text-sm text-muted-foreground">{exchange.type}</p>
                                            {exchange.status === "coming_soon" && (
                                                <Badge variant="outline" className="w-fit">Coming Soon</Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedExchange(null)}
                                >
                                    ← Back
                                </Button>
                                <Badge variant="secondary">
                                    {EXCHANGES.find(e => e.id === selectedExchange)?.name}
                                </Badge>
                                <div className="flex gap-2">
                                    {(["15m", "1h", "4h", "1d"] as Timeframe[]).map((tf) => (
                                        <Button
                                            key={tf}
                                            variant={timeframe === tf ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setTimeframe(tf)}
                                        >
                                            {tf}
                                        </Button>
                                    ))}
                                </div>
                                <div className="ml-auto relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-2xl font-bold">{filteredSignals.length}</div>
                                        <p className="text-xs text-muted-foreground">Total Signals</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-2xl font-bold text-green-500">
                                            {filteredSignals.filter(s => s.type === "BUY").length}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" /> Buy Signals
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-2xl font-bold text-red-500">
                                            {filteredSignals.filter(s => s.type === "SELL").length}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3" /> Sell Signals
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Loading signals...
                                </div>
                            ) : filteredSignals.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No signals found
                                </div>
                            ) : (
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Symbol</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Entry</TableHead>
                                                <TableHead>Stop Loss</TableHead>
                                                <TableHead>Take Profit</TableHead>
                                                <TableHead>R:R</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSignals.map((signal, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{signal.symbol}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={signal.type === "BUY" ? "default" : "destructive"}>
                                                            {signal.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        "h-full",
                                                                        signal.score >= 80 ? "bg-green-500" :
                                                                            signal.score >= 60 ? "bg-yellow-500" : "bg-orange-500"
                                                                    )}
                                                                    style={{ width: `${signal.score}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm">{signal.score}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        ${signal.entryPrice.toFixed(signal.entryPrice < 1 ? 6 : 2)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                                        ${signal.stopLoss.toFixed(signal.stopLoss < 1 ? 6 : 2)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm text-green-500">
                                                        ${signal.takeProfit.toFixed(signal.takeProfit < 1 ? 6 : 2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{signal.rrRatio.toFixed(1)}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={signal.status === "ACTIVE" ? "default" : "secondary"}>
                                                            {signal.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
