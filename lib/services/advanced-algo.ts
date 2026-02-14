
import { MASignal } from "./coingecko";

// --- CONFIGURATION ---
const CONFIG = {
    FastMA: 5,
    SlowMA: 12,
    TrendMA: 50,
    ATR_Period: 14,
    RSI_Period: 14,
    Stoch_K: 5,
    Stoch_D: 3,
    Stoch_Slow: 3,
    RSI_Overbought: 70, // Relaxed from 75 to check logic first? No, keep logic strict but scan more candles.
    RSI_Oversold: 30, // Relaxed from 25
    Stoch_Overbought: 80,
    Stoch_Oversold: 20,
    Volume_Multiplier: 1.2,
    Volume_Period: 20,
    ATR_SL_Mult: 1.5,
    ATR_TP_Mult: 2.0,
    Min_RR: 1.0,
};

// --- TYPES ---
export type ExchangeId = "binance_futures" | "coinbase" | "coinbase_intl";
export type Timeframe = "15m" | "1h" | "4h" | "1d";

export interface OHLCV {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type AdvancedSignal = {
    symbol: string;
    exchange: string;
    type: "BUY" | "SELL";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    rrRatio: number;
    score: number;
    reason: string[];
    timestamp: number;
    status: "ACTIVE" | "PENDING";
    currentPrice: number;
    link: string;
};

// --- INDICATOR MATH (The "Core Formula") ---

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

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const trs: number[] = [];
    const atr: number[] = new Array(highs.length).fill(0);

    for (let i = 0; i < highs.length; i++) {
        if (i === 0) {
            trs.push(highs[i] - lows[i]);
            continue;
        }
        const hl = highs[i] - lows[i];
        const hc = Math.abs(highs[i] - closes[i - 1]);
        const lc = Math.abs(lows[i] - closes[i - 1]);
        trs.push(Math.max(hl, hc, lc));
    }

    let sum = 0;
    for (let i = 0; i < period; i++) sum += trs[i];
    atr[period - 1] = sum / period;

    for (let i = period; i < trs.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + trs[i]) / period;
    }
    return atr;
}

function calculateRSI(closes: number[], period: number): number[] {
    const rsi: number[] = new Array(closes.length).fill(0);
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    rsi[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));

    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgGain / (avgLoss || 0.0000001);
        rsi[i] = 100 - (100 / (1 + rs));
    }
    return rsi;
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], periodK: number, periodD: number, slowing: number): { k: number[], d: number[] } {
    const kBuffer: number[] = new Array(closes.length).fill(0);
    const dBuffer: number[] = new Array(closes.length).fill(0);
    const rawK: number[] = new Array(closes.length).fill(0);

    for (let i = periodK - 1; i < closes.length; i++) {
        let highest = -Infinity;
        let lowest = Infinity;
        for (let j = 0; j < periodK; j++) {
            if (highs[i - j] > highest) highest = highs[i - j];
            if (lows[i - j] < lowest) lowest = lows[i - j];
        }
        const range = highest - lowest;
        rawK[i] = range === 0 ? 50 : ((closes[i] - lowest) / range) * 100;
    }

    for (let i = periodK + slowing - 1; i < closes.length; i++) {
        let sum = 0;
        for (let j = 0; j < slowing; j++) sum += rawK[i - j];
        kBuffer[i] = sum / slowing;
    }

    for (let i = periodK + slowing + periodD - 1; i < closes.length; i++) {
        let sum = 0;
        for (let j = 0; j < periodD; j++) sum += kBuffer[i - j];
        dBuffer[i] = sum / periodD;
    }

    return { k: kBuffer, d: dBuffer };
}

// --- PATTERN RECOGNITION ---

function checkBullishPattern(open: number, close: number, high: number, low: number, prevOpen: number, prevClose: number, prevHigh: number, prevLow: number): boolean {
    const isEngulfing = (close > open) && (prevClose < prevOpen) && (close > prevOpen) && (open < prevClose);
    const body = Math.abs(close - open);
    const lowerWick = Math.min(open, close) - low;
    const upperWick = high - Math.max(open, close);
    const isPinBar = (lowerWick > body * 2) && (upperWick < body);
    return isEngulfing || isPinBar;
}

function checkBearishPattern(open: number, close: number, high: number, low: number, prevOpen: number, prevClose: number, prevHigh: number, prevLow: number): boolean {
    const isEngulfing = (close < open) && (prevClose > prevOpen) && (close < prevOpen) && (open > prevClose);
    const body = Math.abs(close - open);
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;
    const isPinBar = (upperWick > body * 2) && (lowerWick < body);
    return isEngulfing || isPinBar;
}

// --- SIGNAL GENERATOR (The Unified Processor) ---

function analyzePair(symbol: string, klinesM15: OHLCV[], klinesH1: OHLCV[], exchange: string, link: string): AdvancedSignal | null {
    if (klinesM15.length < 60 || klinesH1.length < 60) return null;

    const c15 = klinesM15.map(k => k.close);
    const h15 = klinesM15.map(k => k.high);
    const l15 = klinesM15.map(k => k.low);
    const o15 = klinesM15.map(k => k.open);
    const v15 = klinesM15.map(k => k.volume);
    const cH1 = klinesH1.map(k => k.close);

    // 1. Indicators (Calculate once for whole array)
    const emaFast = calculateEMA(c15, CONFIG.FastMA);
    const emaSlow = calculateEMA(c15, CONFIG.SlowMA);
    const emaTrend = calculateEMA(c15, CONFIG.TrendMA);

    const htfEmaFast = calculateEMA(cH1, CONFIG.FastMA);
    const htfEmaSlow = calculateEMA(cH1, CONFIG.SlowMA);
    const htfEmaTrend = calculateEMA(cH1, CONFIG.TrendMA);
    const htfIdx = cH1.length - 1;

    const atr = calculateATR(h15, l15, c15, CONFIG.ATR_Period);
    const rsi = calculateRSI(c15, CONFIG.RSI_Period);
    const stoch = calculateStochastic(h15, l15, c15, CONFIG.Stoch_K, CONFIG.Stoch_D, CONFIG.Stoch_Slow);

    // LOOP BACK: Check last 24 candles (approx 6 hours on M15) for a valid signal that is still relevant
    // We want the *latest* valid signal.
    // Start from length-2 (last closed candle) down to length-26

    const scannerStart = c15.length - 2;
    // Ensure enough history for all indicators (e.g., TrendMA, Stoch, ATR, RSI)
    const minRequiredHistory = Math.max(CONFIG.TrendMA, CONFIG.ATR_Period, CONFIG.RSI_Period, CONFIG.Stoch_K + CONFIG.Stoch_Slow + CONFIG.Stoch_D, CONFIG.Volume_Period) + 2;
    const scannerEnd = Math.max(minRequiredHistory, c15.length - 26);

    for (let i = scannerStart; i >= scannerEnd; i--) {
        const prev = i;       // Signal Candle
        const prev2 = i - 1;  // Pre-Signal Candle
        const curr = c15.length - 1; // Live Candle

        // 2. Logic - Crossovers
        const bullCross = (emaFast[prev] > emaSlow[prev]) && (emaFast[prev2] <= emaSlow[prev2]);
        const bearCross = (emaFast[prev] < emaSlow[prev]) && (emaFast[prev2] >= emaSlow[prev2]);

        if (!bullCross && !bearCross) continue; // Not a signal candle, check previous

        // We found a crossover at 'i'. Now validate it.
        let score = 50;
        const reasons: string[] = [];

        // 3. Filters (Check at the moment of signal 'prev')
        // Trend
        const bullTrend = emaFast[prev] > emaSlow[prev] && emaSlow[prev] > emaTrend[prev];
        const bearTrend = emaFast[prev] < emaSlow[prev] && emaSlow[prev] < emaTrend[prev];
        if (bullCross && !bullTrend) score -= 20;
        if (bearCross && !bearTrend) score -= 20;

        // HTF Trend (Approximate, using current HTF status is usually fine, or map time)
        const htfBull = htfEmaFast[htfIdx] > htfEmaSlow[htfIdx] && htfEmaSlow[htfIdx] > htfEmaTrend[htfIdx];
        const htfBear = htfEmaFast[htfIdx] < htfEmaSlow[htfIdx] && htfEmaSlow[htfIdx] < htfEmaTrend[htfIdx]; // Fixed logic error < vs >
        if (bullCross && htfBull) { score += 20; reasons.push("HTF Bullish"); }
        if (bearCross && htfBear) { score += 20; reasons.push("HTF Bearish"); }

        // Volume
        let volSum = 0;
        for (let j = 0; j < CONFIG.Volume_Period; j++) {
            if (prev - j < 0) { // Ensure we don't go out of bounds for volume history
                volSum += v15[0]; // Use earliest available volume if not enough history
            } else {
                volSum += v15[prev - j];
            }
        }
        const volAvg = volSum / CONFIG.Volume_Period;

        if (v15[prev] > volAvg * CONFIG.Volume_Multiplier) {
            score += 10;
            reasons.push("High Volume");
        }

        // RSI
        if (bullCross) {
            if (rsi[prev] > CONFIG.RSI_Overbought) continue; // Filtered
            score += 5;
        }
        if (bearCross) {
            if (rsi[prev] < CONFIG.RSI_Oversold) continue; // Filtered
            score += 5;
        }

        // Stochastic
        if (bullCross && stoch.k[prev] > CONFIG.Stoch_Overbought) continue;
        if (bearCross && stoch.k[prev] < CONFIG.Stoch_Oversold) continue;

        // Patterns
        const isBullPattern = checkBullishPattern(o15[prev], c15[prev], h15[prev], l15[prev], o15[prev2], c15[prev2], h15[prev2], l15[prev2]);
        const isBearPattern = checkBearishPattern(o15[prev], c15[prev], h15[prev], l15[prev], o15[prev2], c15[prev2], h15[prev2], l15[prev2]);

        if (bullCross && isBullPattern) { score += 15; reasons.push("Bullish Pattern"); }
        if (bearCross && isBearPattern) { score += 15; reasons.push("Bearish Pattern"); }

        // 4. Trade Values
        const currentPrice = c15[curr]; // Live Price
        const signalPrice = c15[prev]; // Price at signal close
        const signalATR = atr[prev];

        let type: "BUY" | "SELL" | null = null;
        let sl = 0, tp = 0;

        // Calculate SL/TP based on SIGNAL candle ATR, but projected from current price? 
        // Ideally, if signal is old, Entry was 'signalPrice'. If currentPrice is far, it might be invalid.
        // Let's use 'currentPrice' as entry for now, but warn if it moved too much?
        // Actually, standard algo logic: Entry is at Open of 'prev+1'. 
        // If we are displaying "Active Setup", we assume user enters NOW.
        // Let's use CurrentPrice.

        if (bullCross) {
            type = "BUY";
            sl = signalPrice - (signalATR * CONFIG.ATR_SL_Mult); // SL based on structure at signal
            tp = signalPrice + (signalATR * CONFIG.ATR_TP_Mult); // TP based on structure at signal
            // Recalculate RR based on current price entry
            // If current price > tp, trade is done.
            if (currentPrice >= tp) continue; // Trade hit TP already
            if (currentPrice <= sl) continue; // Trade hit SL already
        } else {
            type = "SELL";
            sl = signalPrice + (signalATR * CONFIG.ATR_SL_Mult);
            tp = signalPrice - (signalATR * CONFIG.ATR_TP_Mult);
            if (currentPrice <= tp) continue;
            if (currentPrice >= sl) continue;
        }

        const risk = Math.abs(currentPrice - sl);
        const reward = Math.abs(tp - currentPrice);
        const rr = risk === 0 ? 0 : reward / risk;

        if (score < 60) continue;
        if (rr < 0.5) continue; // Bad RR now

        return {
            symbol,
            exchange,
            link,
            type,
            entryPrice: currentPrice,
            stopLoss: sl,
            takeProfit: tp,
            rrRatio: rr,
            score,
            reason: reasons,
            timestamp: klinesM15[prev].time,
            status: "ACTIVE",
            currentPrice
        };
    }

    return null;
}

const TIMEFRAME_MAP: Record<string, { main: string, htf: string }> = {
    "15m": { main: "15m", htf: "1h" }, // Scalping
    "1h": { main: "1h", htf: "4h" },   // Day Trading
    "4h": { main: "4h", htf: "1d" },   // Swing
    "1d": { main: "1d", htf: "1w" },   // Investing
};

// --- EXCHANGE API INTEGRATIONS ---

// 1. Binance Futures
async function fetchBinanceKlines(symbol: string, interval: string, limit: number = 200): Promise<OHLCV[]> { // Increase limit
    try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        if (!res.ok) return [];
        const data = await res.json();
        // [time, open, high, low, close, vol, ...]
        return data.map((d: any) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]),
        }));
    } catch (e) {
        console.error(`Error fetching Binance klines for ${symbol}:`, e);
        return [];
    }
}

async function getBinanceSignals(selectedTf: string): Promise<AdvancedSignal[]> {
    const tf = TIMEFRAME_MAP[selectedTf] || TIMEFRAME_MAP["15m"];

    // Get Top 30 Vol Pairs
    let pairs: string[] = [];
    try {
        const res = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr", { next: { revalidate: 60 } });
        if (res.ok) {
            const data = await res.json();
            pairs = data
                .filter((t: any) => t.symbol.endsWith("USDT") && parseFloat(t.quoteVolume) > 50000000)
                .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 30) // Top 30
                .map((t: any) => t.symbol);
        }
    } catch (e) { return []; }

    const results: AdvancedSignal[] = [];

    // Batch 10
    for (let i = 0; i < pairs.length; i += 10) {
        const batch = pairs.slice(i, i + 10);
        await Promise.all(batch.map(async (p) => {
            const [mainTF, htfTF] = await Promise.all([
                fetchBinanceKlines(p, tf.main, 200),
                fetchBinanceKlines(p, tf.htf, 100)
            ]);
            const sig = analyzePair(p.replace("USDT", ""), mainTF, htfTF, "BINANCE FUTURES", `https://www.binance.com/en/futures/${p}`);
            if (sig) results.push(sig);
        }));
    }
    return results;
}

// 2. Coinbase Spot
async function fetchCoinbaseKlines(productId: string, granularity: number): Promise<OHLCV[]> {
    try {
        // 900 = 15m, 3600 = 1h
        const res = await fetch(`https://api.exchange.coinbase.com/products/${productId}/candles?granularity=${granularity}`, {
            headers: { 'User-Agent': 'Coinpree/1.0' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        // Coinbase returns: [time, low, high, open, close, volume]
        // Note: order is [time, low, high, open, close, volume]
        return data.reverse().map((d: any) => ({
            time: d[0] * 1000,
            low: d[1],
            high: d[2],
            open: d[3],
            close: d[4],
            volume: d[5],
        }));
    } catch (e) {
        console.error(`Error fetching Coinbase klines for ${productId}:`, e);
        return [];
    }
}

// Coinbase Granularity Map (seconds)
const COINBASE_GRANULARITY: Record<string, number> = {
    "15m": 900,
    "1h": 3600,
    "4h": 21600,
    "1d": 86400,
};

async function getCoinbaseSignals(selectedTf: string): Promise<AdvancedSignal[]> {
    const tf = TIMEFRAME_MAP[selectedTf] || TIMEFRAME_MAP["15m"];
    const mainGran = COINBASE_GRANULARITY[tf.main] || 900;
    const htfGran = COINBASE_GRANULARITY[tf.htf] || 3600;

    const products = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "XRP-USD", "ADA-USD", "AVAX-USD", "LINK-USD", "LTC-USD", "SHIB-USD"];

    const results: AdvancedSignal[] = [];

    for (const p of products) {
        const [mainCandles, htfCandles] = await Promise.all([
            fetchCoinbaseKlines(p, mainGran),
            fetchCoinbaseKlines(p, htfGran)
        ]);
        const sig = analyzePair(p.split("-")[0], mainCandles, htfCandles, "COINBASE", `https://www.coinbase.com/advanced-trade/spot/${p}`);
        if (sig) results.push(sig);
        // Rate limit ease
        await new Promise(r => setTimeout(r, 250));
    }
    return results;
}

// 3. Coinbase International (Perps)
async function fetchCoinbaseIntlKlines(instrument: string, granularity: string): Promise<OHLCV[]> {
    try {
        const res = await fetch(`https://api.international.coinbase.com/api/v1/instruments/${instrument}/candles?granularity=${granularity}`, {
            headers: { 'User-Agent': 'Coinpree/1.0' }
        });
        if (!res.ok) return [];
        const json = await res.json();

        // Response format: { "aggregations": [ { "start": "2023-...", "open": "...", ... } ] }
        // Or sometimes direct array? The docs say "aggregations".
        const data = json.aggregations || json;

        if (!Array.isArray(data)) return [];

        return data.map((d: any) => ({
            time: new Date(d.start).getTime(),
            open: parseFloat(d.open),
            high: parseFloat(d.high),
            low: parseFloat(d.low),
            close: parseFloat(d.close),
            volume: parseFloat(d.volume),
        })).sort((a: any, b: any) => a.time - b.time); // Ensure sorted by time ascending
    } catch (e) {
        console.error(`Error fetching Coinbase Intl klines for ${instrument}:`, e);
        return [];
    }
}

// Coinbase Intl Granularity Map (String Enum)
const COINBASE_INTL_GRANULARITY: Record<string, string> = {
    "15m": "FIFTEEN_MINUTE",
    "1h": "ONE_HOUR",
    "4h": "FOUR_HOUR", // Assuming exist? Need verify. Docs show PERPETUAL candles? 
    // Actually, check docs: ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE, ONE_HOUR, TWO_HOUR, SIX_HOUR, ONE_DAY
    "1d": "ONE_DAY"
};

async function getCoinbaseIntlSignals(selectedTf: string): Promise<AdvancedSignal[]> {
    const tf = TIMEFRAME_MAP[selectedTf] || TIMEFRAME_MAP["15m"];

    // Map HTF properly for Coinbase Intl
    // 15m -> 1h | 1h -> 6h (closest to 4h) | 4h -> 1d | 1d -> 1d (Use same only? Or no weekly yet?)
    // Let's approximate: 15m->1h, 1h->6h, 4h->1d, 1d->1d
    const mainKey = selectedTf === "4h" ? "FOUR_HOUR" : COINBASE_INTL_GRANULARITY[tf.main]; // Wait, does 4h exist? Let's use 6h if not
    // Safe map:
    let mainG = "FIFTEEN_MINUTE";
    let htfG = "ONE_HOUR";

    if (selectedTf === "15m") { mainG = "FIFTEEN_MINUTE"; htfG = "ONE_HOUR"; }
    else if (selectedTf === "1h") { mainG = "ONE_HOUR"; htfG = "SIX_HOUR"; }
    else if (selectedTf === "4h") { mainG = "SIX_HOUR"; htfG = "ONE_DAY"; } // Use 6h for 4h request as closest
    else if (selectedTf === "1d") { mainG = "ONE_DAY"; htfG = "ONE_DAY"; }

    let instruments: string[] = [];
    try {
        const res = await fetch("https://api.international.coinbase.com/api/v1/instruments");
        if (res.ok) {
            const data = await res.json();
            // Filter for ACTIVE PERPETUALS
            instruments = data
                .filter((i: any) => i.type === "PERPETUAL" && i.status === "ACTIVE")
                .map((i: any) => i.instrument_id) // e.g., "BTC-PERP"
                .slice(0, 30); // Top 30
        }
    } catch (e) { return []; }

    const results: AdvancedSignal[] = [];

    // Batch 5 to avoid rate limits (stricter on Intl?)
    for (let i = 0; i < instruments.length; i += 5) {
        const batch = instruments.slice(i, i + 5);
        await Promise.all(batch.map(async (inst) => {
            const [mainCandles, htfCandles] = await Promise.all([
                fetchCoinbaseIntlKlines(inst, mainG),
                fetchCoinbaseIntlKlines(inst, htfG)
            ]);
            // Link to international exchange
            const sig = analyzePair(inst.replace("-PERP", ""), mainCandles, htfCandles, "COINBASE INTL", `https://international.coinbase.com/trade/${inst}`);
            if (sig) results.push(sig);
        }));
        await new Promise(r => setTimeout(r, 500));
    }
    return results;
}

// --- MAIN ACTION ---
export async function getAdvancedSignalsAction(exchangeId?: string, timeframe: string = "15m"): Promise<AdvancedSignal[]> {
    if (exchangeId === "coinbase") {
        return await getCoinbaseSignals(timeframe);
    } else if (exchangeId === "coinbase_intl") {
        return await getCoinbaseIntlSignals(timeframe);
    } else {
        // Default to Binance Futures
        // Pass timeframe if we implement multi-tf selection, for now default strategy uses M15/H1 fixed
        return await getBinanceSignals(timeframe);
    }
}
