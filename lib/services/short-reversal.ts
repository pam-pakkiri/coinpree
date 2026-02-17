import { fetchBinanceKlines, fetchTopCoins } from "./coingecko";

// --- Helpers for other exchanges (Duplicated from advanced-algo to keep independent) ---
async function fetchBybitKlines(symbol: string, interval: string, limit: number = 200): Promise<any[]> {
    try {
        let bybitInterval = interval.replace("m", "");
        if (interval === "1h") bybitInterval = "60";
        if (interval === "2h") bybitInterval = "120";
        if (interval === "4h") bybitInterval = "240";
        if (interval === "1d") bybitInterval = "D";

        const res = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`);
        if (!res.ok) return [];
        const json = await res.json();
        if (json.retCode !== 0) return [];

        // Bybit returns [startTime, open, high, low, close, volume, ...]
        return json.result.list.reverse().map((d: any) => [
            parseInt(d[0]), parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]), parseFloat(d[4]), parseFloat(d[5])
        ]);
    } catch (e) { return []; }
}

async function fetchBitgetKlines(symbol: string, interval: string, limit: number = 200): Promise<any[]> {
    try {
        let bgInterval = interval;
        if (interval === "1h") bgInterval = "1H";
        if (interval === "2h") bgInterval = "2H";
        if (interval === "4h") bgInterval = "4H";
        if (interval === "1d") bgInterval = "1D";

        const res = await fetch(`https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol}&granularity=${bgInterval}&limit=${limit}&productType=USDT-FUTURES`);
        if (!res.ok) return [];
        const json = await res.json();
        if (json.code !== "00000") return [];

        return json.data.map((d: any) => [
            parseInt(d[0]), parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]), parseFloat(d[4]), parseFloat(d[5])
        ]);
    } catch (e) { return []; }
}

export interface ShortReversalSignal {
    coinId: string;
    symbol: string;
    name: string;
    image: string;
    price: number;
    exhaustionCandle: {
        high: number;
        low: number;
        open: number;
        close: number;
        volume: number;
        timestamp: number;
        upperWickPct: number;
        bodyPct: number;
        movePct: number;
    };
    metrics: {
        ema50: number;
        ema200: number;
        vol20Avg: number;
        volRatio: number;
    };
    setup: "CONFIRMED" | "POTENTIAL";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    timestamp: number;
    chartData: { open: number; high: number; low: number; close: number }[];
    exchange: string;
    firstSeen?: number;
    lastUpdate?: number;
}

function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray: number[] = new Array(prices.length).fill(0);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += prices[i];
    emaArray[period - 1] = sum / period;
    for (let i = period; i < prices.length; i++) {
        emaArray[i] = prices[i] * k + emaArray[i - 1] * (1 - k);
    }
    return emaArray;
}

function calculateSMA(data: number[], period: number): number[] {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(0);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j];
        sma.push(sum / period);
    }
    return sma;
}

// Identify Swing Highs for Liquidity Sweep detection
function findSwingHighs(highs: number[], lookback: number = 10): { index: number, price: number }[] {
    const swings = [];
    for (let i = lookback; i < highs.length - 2; i++) { // Don't check extremely recent to allow sweep
        let isHigh = true;
        for (let j = 1; j <= lookback; j++) {
            if (highs[i - j] >= highs[i]) { isHigh = false; break; }
        }
        if (isHigh) swings.push({ index: i, price: highs[i] });
    }
    return swings;
}

export async function scanShortReversalSignals(timeframe: string = "1d", exchange: string = "binance_futures", limit: number = 80): Promise<ShortReversalSignal[]> {
    console.log(`🔄 Scanning for Modern Short Reversal Setups (${timeframe} on ${exchange}) limit: ${limit}...`);

    // ... (rest of exchange pair logic)
    let exchangePairs: string[] = [];
    if (exchange === "bybit") {
        try {
            const res = await fetch("https://api.bybit.com/v5/market/tickers?category=linear", { next: { revalidate: 60 } });
            if (res.ok) {
                const json = await res.json();
                if (json.retCode === 0) exchangePairs = json.result.list.filter((t: any) => t.symbol.endsWith("USDT")).map((t: any) => t.symbol);
            }
        } catch (e) { }
    } else if (exchange === "bitget") {
        try {
            const res = await fetch("https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES", { next: { revalidate: 60 } });
            if (res.ok) {
                const json = await res.json();
                if (json.code === "00000") exchangePairs = json.data.map((t: any) => t.symbol);
            }
        } catch (e) { }
    }

    // Default to CoinGecko list for Binance or fallback
    const cgCoins = await fetchTopCoins();

    // Construct the list to scan
    let scanList: { symbol: string, coinObj: any }[] = [];

    if (exchangePairs.length > 0) {
        // Limit to requested count
        exchangePairs = exchangePairs.slice(0, limit);

        scanList = exchangePairs.map(pair => {
            // Try to find matching CG coin
            const base = pair.replace("USDT", "").replace("1000", "").toLowerCase();
            const match = cgCoins.find(c => c.symbol.toLowerCase() === base);
            return {
                symbol: pair,
                coinObj: match || {
                    id: base,
                    symbol: base,
                    name: pair,
                    image: `https://ui-avatars.com/api/?name=${base}&background=random` // Fallback image
                }
            };
        });
    } else {
        // Fallback or Binance: Use CG list (limited)
        scanList = cgCoins.slice(0, limit).map(c => ({
            symbol: c.symbol.toUpperCase() + "USDT",
            coinObj: c
        }));
    }

    const signals: ShortReversalSignal[] = [];

    // Process scanList
    const BATCH_SIZE = 20;
    for (let i = 0; i < scanList.length; i += BATCH_SIZE) {
        const batch = scanList.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async ({ symbol, coinObj }) => {
            try {
                let klines: any[] = [];

                if (exchange === "bybit") {
                    klines = await fetchBybitKlines(symbol, timeframe, 200);
                } else if (exchange === "bitget") {
                    klines = await fetchBitgetKlines(symbol, timeframe, 200);
                } else {
                    klines = await fetchBinanceKlines(symbol, timeframe) || [];
                }

                if (!klines || klines.length < 201) return;

                const closes = klines.map(k => k[4]);
                const highs = klines.map(k => k[2]);
                const lows = klines.map(k => k[3]);
                const opens = klines.map(k => k[1]);
                const volumes = klines.map(k => k[5]);
                const timestamps = klines.map(k => k[0]);

                const len = closes.length;
                const currentIdx = len - 1; // Live/Today
                const prevIdx = len - 2; // Yesterday (Completed)

                // 1. Indicators
                const ema50 = calculateEMA(closes, 50);
                const ema200 = calculateEMA(closes, 200);
                const volSMA20 = calculateSMA(volumes, 20);

                // 2. Logic: Liquidity Sweep (Turtle Soup)
                // We look for a candle (Recent, e.g., Yesterday or Today-so-far) that:
                // a) Took out a previous Swing High (Sweep)
                // b) Closed BELOW that Swing High (Rejection)

                const swings = findSwingHighs(highs, 10); // Find major highs in last ~500 candles
                // Filter swings: Must not be TOO recent (allow formation) and within reasonable history
                const relevantSwings = swings.filter(s => s.index < len - 3 && s.index > len - 300);

                // Check Yesterday (prevIdx) for Sweep
                let sweepCandleIdx = -1;

                // Did Yesterday sweep any recent high?
                for (const swing of relevantSwings) {
                    // Check if High > SwingHigh AND Close < SwingHigh
                    if (highs[prevIdx] > swing.price && closes[prevIdx] < swing.price) {
                        sweepCandleIdx = prevIdx;
                        break;
                    }
                }

                if (sweepCandleIdx === -1) {
                    // Also check Today (live) -> aggressive entry
                    for (const swing of relevantSwings) {
                        if (highs[currentIdx] > swing.price && closes[currentIdx] < swing.price) {
                            sweepCandleIdx = currentIdx;
                            break;
                        }
                    }
                }

                if (sweepCandleIdx === -1) return; // No sweep found

                // 3. Filters
                // Volume acceleration on sweep?
                const volAvg = volSMA20[sweepCandleIdx];
                const vol = volumes[sweepCandleIdx];
                if (vol < volAvg * 0.8) return; // Allow slightly lower volume if structure is good

                // Wick properties
                const range = highs[sweepCandleIdx] - lows[sweepCandleIdx];
                const upperWick = highs[sweepCandleIdx] - Math.max(opens[sweepCandleIdx], closes[sweepCandleIdx]);
                const wickPct = (upperWick / range) * 100;

                // 4. Trade Setup
                const isConfirmed = closes[sweepCandleIdx] < opens[sweepCandleIdx]; // Bearish candle

                signals.push({
                    coinId: coinObj.id,
                    symbol: coinObj.symbol.toUpperCase(),
                    name: coinObj.name,
                    image: coinObj.image,
                    price: closes[len - 1], // Live price
                    exhaustionCandle: {
                        high: highs[sweepCandleIdx],
                        low: lows[sweepCandleIdx],
                        open: opens[sweepCandleIdx],
                        close: closes[sweepCandleIdx],
                        volume: volumes[sweepCandleIdx],
                        timestamp: timestamps[sweepCandleIdx],
                        upperWickPct: wickPct,
                        bodyPct: (Math.abs(closes[sweepCandleIdx] - opens[sweepCandleIdx]) / range) * 100,
                        movePct: ((highs[sweepCandleIdx] - lows[sweepCandleIdx]) / lows[sweepCandleIdx]) * 100
                    },
                    metrics: {
                        ema50: ema50[sweepCandleIdx],
                        ema200: ema200[sweepCandleIdx],
                        vol20Avg: volAvg,
                        volRatio: vol / (volAvg || 1)
                    },
                    setup: isConfirmed ? "CONFIRMED" : "POTENTIAL",
                    entryPrice: lows[sweepCandleIdx], // Aggressive: break of candle low
                    stopLoss: highs[sweepCandleIdx],
                    takeProfit: lows[sweepCandleIdx] - (highs[sweepCandleIdx] - lows[sweepCandleIdx]) * 2, // 2R
                    timestamp: Date.now(),
                    chartData: klines.slice(-30).map(k => ({
                        open: k[1], high: k[2], low: k[3], close: k[4]
                    })),
                    exchange: exchange
                });

            } catch (error) { }
        }));
        await new Promise(r => setTimeout(r, 200)); // Rate limit pause
    }

    // Sort by setup quality (Confirmed first)
    return signals.sort((a, b) => {
        if (a.setup === "CONFIRMED" && b.setup !== "CONFIRMED") return -1;
        if (b.setup === "CONFIRMED" && a.setup !== "CONFIRMED") return 1;
        return b.metrics.volRatio - a.metrics.volRatio;
    });
}

