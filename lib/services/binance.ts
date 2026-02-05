import { MASignal, getBinanceCoinMapping } from "./coingecko";

const BINANCE_FAPI_BASE = "https://fapi.binance.com/fapi/v1";

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// [timestamp, open, high, low, close, volume, ...]
type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

/**
 * Calculate Exponential Moving Average (EMA)
 * Copied from coingecko.ts to avoid circular deps or refactoring
 */
function calculateEMA(prices: number[], period: number): number {
  if (!prices || prices.length < period) return 0;

  const multiplier = 2 / (period + 1);
  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate volatility based on price changes
 */
function calculateVolatility(prices: number[]): number {
  if (!prices || prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance) * 100;
}

// Relative Strength Index (RSI) calculation
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 0;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth subsequent values
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Cache for Binance signals
let binanceSignalsCache: {
  data: MASignal[];
  timestamp: number;
  timeframe: string;
} | null = null;
const BINANCE_CACHE_DURATION = 30000; // 30 seconds

export async function getBinanceFuturesSignals(
  timeframe: string = "1h",
): Promise<MASignal[]> {
  try {
    // Check cache
    const now = Date.now();
    if (
      binanceSignalsCache &&
      binanceSignalsCache.timeframe === timeframe &&
      (now - binanceSignalsCache.timestamp < BINANCE_CACHE_DURATION)
    ) {
      console.log(`⚡ Using cached Binance Futures signals for ${timeframe}`);
      return binanceSignalsCache.data;
    }

    // Map timeframe to Binance interval
    const intervalMap: { [key: string]: string } = {
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1h": "1h",
      "4h": "4h",
      "1d": "1d",
    };
    const interval = intervalMap[timeframe] || "1h";

    // 1. Fetch 24h ticker to get volume and list of pairs
    const tickerRes = await fetch(`${BINANCE_FAPI_BASE}/ticker/24hr`, {
      next: { revalidate: 60 },
    });
    if (!tickerRes.ok) throw new Error("Failed to fetch Binance tickers");

    const tickers: BinanceTicker[] = await tickerRes.json();

    // Filter USDT pairs and sort by volume (quoteVolume is volume in USD approx)
    // User Requirement: > 10M 24hr trading volume
    const topPairs = tickers
      .filter(
        (t) =>
          t.symbol.endsWith("USDT") && parseFloat(t.quoteVolume) > 10000000,
      )
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 100); // Analyze top 100 pairs with high volume

    const signals: MASignal[] = [];

    // Process pairs in parallel batches for speed
    const batchSize = 20; // Process 20 pairs at once
    const results: (MASignal | null)[] = [];

    console.log(`🚀 Analyzing ${topPairs.length} Binance Futures pairs in parallel batches...`);

    for (let i = 0; i < topPairs.length; i += batchSize) {
      const batch = topPairs.slice(i, i + batchSize);

      const batchPromises = batch.map(async (pair) => {
        try {
          // Fetch 500 candles for better EMA convergence
          const klineRes = await fetch(
            `${BINANCE_FAPI_BASE}/klines?symbol=${pair.symbol}&interval=${interval}&limit=500`,
          );
          if (!klineRes.ok) return null;

          const klines: BinanceKline[] = await klineRes.json();
          // Parse closes
          const closes = klines.map((k) => parseFloat(k[4]));

          // Need enough data for 99 EMA + convergence
          if (closes.length < 200) return null;

          const prices = closes;
          const currentPrice = prices[prices.length - 1];

          // Calculate EMAs
          const ema7 = calculateEMA(prices, 7);
          const ema99 = calculateEMA(prices, 99);

          // Calculate RSI
          const rsi = calculateRSI(prices, 14);

          // Calculate previous EMAs for crossover detection
          const pricesPrev = prices.slice(0, -1);
          const ema7Prev = calculateEMA(pricesPrev, 7);
          const ema99Prev = calculateEMA(pricesPrev, 99);

          // Determine Signal
          let signalType: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
          let signalName = "No Signal";
          let crossoverStrength = 0;

          // Golden Cross (Strict Freshness: Must have crossed in the LAST candle)
          if (ema7 > ema99 && ema7Prev <= ema99Prev) {
            signalType = "BUY";
            signalName = `Golden Cross (Fresh)`;
            crossoverStrength = ((ema7 - ema99) / ema99) * 100;
          }
          // Death Cross (Strict Freshness)
          else if (ema7 < ema99 && ema7Prev >= ema99Prev) {
            signalType = "SELL";
            signalName = `Death Cross (Fresh)`;
            crossoverStrength = ((ema99 - ema7) / ema99) * 100;
          }

          // NO TREND SIGNALS - User requested ONLY fresh crossovers.

          if (signalType === "NEUTRAL") return null;

          const volatility = calculateVolatility(prices);
          // Calculate entry, stop loss, and take profit based on signal type
          let entryPrice = currentPrice;
          let stopLoss = 0;
          let takeProfit = 0;
          let score = 0;
          const change24h = parseFloat(pair.priceChangePercent);

          // Base Score
          score = 50;

          if (signalType === "BUY") {
            stopLoss = currentPrice * 0.95;
            takeProfit = currentPrice * 1.1;

            if (signalName.includes("Golden Cross"))
              score += 30; // Fresh cross is high value
            else score += 10; // Trend is lower value

            if (rsi > 50 && rsi < 70) score += 10; // Healthy momentum

            score += crossoverStrength * 5;
            score += change24h;
          } else if (signalType === "SELL") {
            stopLoss = currentPrice * 1.05;
            takeProfit = currentPrice * 0.9;

            if (signalName.includes("Death Cross")) score += 30;
            else score += 10;

            if (rsi < 50 && rsi > 30) score += 10;

            score += crossoverStrength * 5;
            score -= change24h;
          }

          // Cap score
          score = Math.min(Math.max(Math.round(score), 0), 100);

          return {
            coinId: pair.symbol,
            symbol: pair.symbol.replace("USDT", ""),
            name: pair.symbol.replace("USDT", ""),
            image: "",
            signalType,
            signalName,
            timeframe,
            score,
            price: currentPrice,
            currentPrice: currentPrice,
            change1h: 0,
            change24h: parseFloat(pair.priceChangePercent),
            change7d: 0,
            volume24h: parseFloat(pair.quoteVolume),
            marketCap: 0,
            timestamp: Date.now(),
            crossoverTimestamp: Date.now(),
            candlesAgo: 0,
            entryPrice,
            stopLoss,
            takeProfit,
            volatility: Math.round(volatility * 100) / 100,
            formula: `EMA7/99 | RSI: ${Math.round(rsi)}`,
            ema7,
            ema99,
            ema7Prev,
            ema99Prev,
            crossoverStrength,
          } as MASignal;
        } catch (err) {
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < topPairs.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    const validSignals = results.filter((s): s is MASignal => s !== null);

    // Sort
    validSignals.sort((a, b) => b.score - a.score);

    console.log(`✅ Found ${validSignals.length} Binance Futures signals (${validSignals.filter(s => s.signalType === 'BUY').length} BUY, ${validSignals.filter(s => s.signalType === 'SELL').length} SELL)`);

    // Cache results
    binanceSignalsCache = {
      data: validSignals,
      timestamp: Date.now(),
      timeframe,
    };

    return validSignals;
  } catch (error) {
    console.error("Error fetching Binance Futures signals:", error);
    return [];
  }
}
