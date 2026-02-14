import { fetchBinanceKlines, fetchTopCoins } from "./coingecko";

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
    setup: "CONFIRMED" | "POTENTIAL"; // CONFIRMED = Price broke low; POTENTIAL = Exhaustion observed, waiting for break
    entryPrice: number; // Low of exhaustion candle (breakdown level)
    stopLoss: number; // High of exhaustion candle
    takeProfit: number; // 2R target
    timestamp: number;
}

// Calculate EMA helpers
function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    let emaArray = new Array(prices.length).fill(0);

    // Simple MA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) sum += prices[i];
    emaArray[period - 1] = sum / period;

    // EMA for rest
    for (let i = period; i < prices.length; i++) {
        emaArray[i] = (prices[i] * k) + (emaArray[i - 1] * (1 - k));
    }
    return emaArray;
}

function calculateSMA(data: number[], period: number): number[] {
    let sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(0);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        sma.push(sum / period);
    }
    return sma;
}

export async function scanShortReversalSignals(): Promise<ShortReversalSignal[]> {
    console.log("🔄 Scanning for Short Reversal Setup...");

    // 1. Get Top Coins (High Volume)
    const coins = await fetchTopCoins();
    const signals: ShortReversalSignal[] = [];

    // 2. Process in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < coins.length; i += BATCH_SIZE) {
        const batch = coins.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (coin) => {
            try {
                // Need approx 200 candles for EMA 200. Daily timeframe is best for this strategy.
                // Or 4H. Let's stick to Daily (1d) as strategy implies "20-day average".
                const klines = await fetchBinanceKlines(coin.symbol.toUpperCase() + "USDT", "1d");
                if (!klines || klines.length < 201) return;

                // Extract arrays
                // Klines: [time, open, high, low, close, volume]
                const closes = klines.map(k => k[4]);
                const highs = klines.map(k => k[2]);
                const lows = klines.map(k => k[3]);
                const opens = klines.map(k => k[1]);
                const volumes = klines.map(k => k[5]);
                const timestamps = klines.map(k => k[0]);

                const len = closes.length;
                const currentIdx = len - 1; // Today (forming)
                const outputIdx = len - 2; // Yesterday (Completed Candle) -> We look for exhaustion HERE usually

                // Current Price
                const currentPrice = closes[currentIdx];

                // Indicators
                const ema50 = calculateEMA(closes, 50);
                const ema200 = calculateEMA(closes, 200);
                const volSMA20 = calculateSMA(volumes, 20);

                // --- STRATEGY CHECKS ---

                // Check last 3 candles for the "Exhaustion" pattern. 
                // Why? Maybe it happened 2 days ago and triggered yesterday.
                // We look at candle len-2 (Yesterday confirmed) or len-1 (Today forming, if huge usage).
                // Let's look at confirmed candle (len-2) as the "Exhaustion Candle".

                const iEx = len - 2; // Index of potential exhaustion candle

                if (iEx < 200) return;

                // 1. Trend Filter: 
                // Price < 200 EMA OR 50 EMA Slope Down/Flat
                const price = closes[iEx];
                const e200 = ema200[iEx];
                const e50 = ema50[iEx];
                const e50Prev = ema50[iEx - 5];
                const e50Slope = e50 - e50Prev; // If negative or close to 0, it's flat/down.

                const isDowntrend = price < e200;
                const isWeakTrend = e50Slope <= 0; // Flat or down

                if (!isDowntrend && !isWeakTrend) return; // Fighting strong uptrend

                // 2. Exhaustion Candle metrics
                const open = opens[iEx];
                const close = closes[iEx];
                const high = highs[iEx];
                const low = lows[iEx];
                const vol = volumes[iEx];
                const volAvg = volSMA20[iEx];

                const range = high - low;
                const body = Math.abs(close - open);
                const upperWick = high - Math.max(open, close);
                const lowerWick = Math.min(open, close) - low;

                // Criteria A: Rises at least 15%? 
                // (High - Low) / Low >= 0.15 OR (Close - Open)/Open >= 0.15?
                // "Exhaustion move" implies a big pump that failed.
                // Let's use Total Range > 15% OR Body > 10% pump.
                // User said "Rises at least 15%".
                const movePct = ((high - low) / low) * 100;
                if (movePct < 15) return; // Must be a big move

                // Criteria B: Volume > 1.5x Avg
                if (vol < 1.5 * volAvg) return;

                // Criteria C: Clear upper wick (at least 30% of range)
                const wickPct = (upperWick / range) * 100;
                if (wickPct < 30) return;

                // 3. Confirmation (The Trigger)
                // We are looking at the current candle (iEx + 1, usually 'Today')
                const currentLow = lows[currentIdx];
                const exhaustionLow = low;

                // Signal Structure
                const entryPrice = low; // Breakdown level
                const sl = high; // Stop above high
                const risk = high - low;
                const tp = entryPrice - (risk * 2); // 2R Target (Short)

                let status: "CONFIRMED" | "POTENTIAL" = "POTENTIAL";

                // If today's price has already broken the low of exhaustion candle
                if (currentLow < exhaustionLow) {
                    status = "CONFIRMED";
                }

                signals.push({
                    coinId: coin.id,
                    symbol: coin.symbol,
                    name: coin.name,
                    image: coin.image,
                    price: currentPrice,
                    exhaustionCandle: {
                        high, low, open, close, volume: vol,
                        timestamp: timestamps[iEx],
                        upperWickPct: wickPct,
                        bodyPct: (body / range) * 100,
                        movePct
                    },
                    metrics: {
                        ema50: e50,
                        ema200: e200,
                        vol20Avg: volAvg,
                        volRatio: vol / volAvg
                    },
                    setup: status,
                    entryPrice,
                    stopLoss: sl,
                    takeProfit: tp,
                    timestamp: Date.now()
                });

            } catch (e) {
                // Ignore individual coin errors
            }
        }));
    }

    console.log(`✅ Found ${signals.length} Short Reversal signals`);
    return signals.sort((a, b) => b.exhaustionCandle.movePct - a.exhaustionCandle.movePct);
}
