// Binance Spot API Service - Accurate MA Crossover Detection
// Uses direct kline/OHLC data from Binance Spot market

export interface MASignal {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  signalType: "BUY" | "SELL";
  signalName: string;
  timeframe: string;
  score: number;
  price: number;
  currentPrice: number;
  change1h: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
  crossoverTimestamp?: number;
  candlesAgo: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  volatility: number;
  formula: string;
  ema7: number;
  ema99: number;
  ema7Prev?: number;
  ema99Prev?: number;
  crossoverStrength: number;
}

const BINANCE_SPOT_BASE = "https://api.binance.com/api/v3";

// Quality filters for spot trading
const MIN_VOLUME_24H = 10000000; // $10M minimum 24h volume
const MIN_PRICE_CHANGE_THRESHOLD = -50; // Skip if dumped >50% in 24h

interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

type BinanceKline = [
  number, // Open time
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string, // Ignore
];

// Cache for signals
const spotSignalsCache: Map<
  string,
  { data: MASignal[]; timestamp: number }
> = new Map();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Calculate Exponential Moving Average (EMA)
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
 * Calculate EMA array for all data points
 */
function calculateEMAArray(prices: number[], period: number): number[] {
  if (!prices || prices.length < period) return [];

  const multiplier = 2 / (period + 1);
  const emaArray: number[] = [];

  // Calculate initial SMA
  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

  // First (period-1) values are 0 (not enough data)
  for (let i = 0; i < period - 1; i++) {
    emaArray.push(0);
  }

  // First valid EMA
  emaArray.push(ema);

  // Calculate rest
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    emaArray.push(ema);
  }

  return emaArray;
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

/**
 * Detect crossover in the last N candles
 */
function detectCrossover(
  ema7Array: number[],
  ema99Array: number[],
  maxCandlesBack: number = 3,
): {
  type: "BUY" | "SELL" | null;
  candlesAgo: number;
  index: number;
  ema7At: number;
  ema99At: number;
  ema7Prev: number;
  ema99Prev: number;
} {
  const len = Math.min(ema7Array.length, ema99Array.length);

  if (len < 100) {
    return {
      type: null,
      candlesAgo: -1,
      index: -1,
      ema7At: 0,
      ema99At: 0,
      ema7Prev: 0,
      ema99Prev: 0,
    };
  }

  // Check last N candles for crossover
  for (let i = len - 1; i >= Math.max(len - maxCandlesBack - 1, 99); i--) {
    const ema7Current = ema7Array[i];
    const ema99Current = ema99Array[i];
    const ema7Prev = ema7Array[i - 1];
    const ema99Prev = ema99Array[i - 1];

    // Skip if data not ready
    if (
      ema7Current === 0 ||
      ema99Current === 0 ||
      ema7Prev === 0 ||
      ema99Prev === 0
    ) {
      continue;
    }

    // Golden Cross (BUY Signal)
    if (ema7Prev <= ema99Prev && ema7Current > ema99Current) {
      return {
        type: "BUY",
        candlesAgo: len - 1 - i,
        index: i,
        ema7At: ema7Current,
        ema99At: ema99Current,
        ema7Prev: ema7Prev,
        ema99Prev: ema99Prev,
      };
    }

    // Death Cross (SELL Signal)
    if (ema7Prev >= ema99Prev && ema7Current < ema99Current) {
      return {
        type: "SELL",
        candlesAgo: len - 1 - i,
        index: i,
        ema7At: ema7Current,
        ema99At: ema99Current,
        ema7Prev: ema7Prev,
        ema99Prev: ema99Prev,
      };
    }
  }

  return {
    type: null,
    candlesAgo: -1,
    index: -1,
    ema7At: 0,
    ema99At: 0,
    ema7Prev: 0,
    ema99Prev: 0,
  };
}

/**
 * Fetch top Binance Spot pairs by volume
 */
async function fetchTopSpotPairs(): Promise<BinanceTicker[]> {
  try {
    const response = await fetch(`${BINANCE_SPOT_BASE}/ticker/24hr`);

    if (!response.ok) {
      console.error(`Failed to fetch Binance Spot tickers: ${response.status}`);
      return [];
    }

    const tickers: BinanceTicker[] = await response.json();

    // Filter USDT pairs with high volume
    const usdtPairs = tickers
      .filter((t) => {
        if (!t.symbol.endsWith("USDT")) return false;
        const volume = parseFloat(t.quoteVolume);
        const priceChange = parseFloat(t.priceChangePercent);

        // Must have minimum volume
        if (volume < MIN_VOLUME_24H) return false;

        // Skip heavily dumped coins
        if (priceChange < MIN_PRICE_CHANGE_THRESHOLD) return false;

        return true;
      })
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 150); // Top 150 pairs

    console.log(
      `✅ Fetched ${usdtPairs.length} high-volume Binance Spot pairs (filtered from ${tickers.length})`,
    );

    return usdtPairs;
  } catch (error) {
    console.error("Error fetching Binance Spot pairs:", error);
    return [];
  }
}

/**
 * Process a single pair for MA crossover
 */
async function processPair(
  pair: BinanceTicker,
  timeframe: string,
): Promise<MASignal | null> {
  try {
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

    // Fetch klines (500 candles for reliable EMA99)
    const response = await fetch(
      `${BINANCE_SPOT_BASE}/klines?symbol=${pair.symbol}&interval=${interval}&limit=500`,
    );

    if (!response.ok) {
      return null;
    }

    const klines: BinanceKline[] = await response.json();

    // Extract close prices
    const closes = klines.map((k) => parseFloat(k[4]));

    if (closes.length < 100) {
      return null;
    }

    const currentPrice = closes[closes.length - 1];

    // Calculate EMA arrays
    const ema7Array = calculateEMAArray(closes, 7);
    const ema99Array = calculateEMAArray(closes, 99);

    if (ema7Array.length < 100 || ema99Array.length < 100) {
      return null;
    }

    // Detect crossover in last 3 candles (FRESH signals only)
    const crossover = detectCrossover(ema7Array, ema99Array, 3);

    if (!crossover.type) {
      return null; // No fresh crossover
    }

    // Get current EMA values
    const ema7 = ema7Array[ema7Array.length - 1];
    const ema99 = ema99Array[ema99Array.length - 1];

    if (!ema7 || !ema99 || ema7 === 0 || ema99 === 0) {
      return null;
    }

    // Calculate metrics
    const crossoverGap = Math.abs(ema7 - ema99);
    const crossoverStrength = (crossoverGap / ema99) * 100;
    const recentPrices = closes.slice(-30);
    const volatility = calculateVolatility(recentPrices);
    const change24h = parseFloat(pair.priceChangePercent);

    // Build signal name
    const signalName =
      crossover.type === "BUY"
        ? crossover.candlesAgo === 0
          ? "🟢 Golden Cross (FRESH!)"
          : `🟢 Golden Cross (${crossover.candlesAgo} candle${crossover.candlesAgo > 1 ? "s" : ""} ago)`
        : crossover.candlesAgo === 0
          ? "🔴 Death Cross (FRESH!)"
          : `🔴 Death Cross (${crossover.candlesAgo} candle${crossover.candlesAgo > 1 ? "s" : ""} ago)`;

    // Calculate signal score (0-100)
    let score = 50; // Base score

    // Freshness bonus (most important)
    if (crossover.candlesAgo === 0) score += 30;
    else if (crossover.candlesAgo === 1) score += 20;
    else if (crossover.candlesAgo === 2) score += 10;

    // Trend alignment bonus
    if (
      (crossover.type === "BUY" && change24h > 0) ||
      (crossover.type === "SELL" && change24h < 0)
    ) {
      score += 10;
    } else if (
      (crossover.type === "BUY" && change24h < -5) ||
      (crossover.type === "SELL" && change24h > 5)
    ) {
      score -= 10; // Strong penalty for divergence
    }

    // Crossover strength bonus
    if (crossoverStrength > 0.5) score += 3;
    if (crossoverStrength > 1.0) score += 3;
    if (crossoverStrength > 2.0) score += 4;

    // Volume bonus
    const volume24h = parseFloat(pair.quoteVolume);
    if (volume24h > 100000000) score += 3; // >$100M
    if (volume24h > 500000000) score += 3; // >$500M
    if (volume24h > 1000000000) score += 4; // >$1B

    // Volatility penalty
    if (volatility > 5) score -= 3;
    if (volatility > 10) score -= 5;
    if (volatility > 15) score -= 7;

    // Cap score between 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Calculate trade levels
    const entryPrice = currentPrice;
    let stopLoss: number;
    let takeProfit: number;

    if (crossover.type === "BUY") {
      stopLoss = currentPrice * 0.97; // 3% stop loss
      takeProfit = currentPrice * 1.06; // 6% take profit
    } else {
      stopLoss = currentPrice * 1.03; // 3% stop loss (for short)
      takeProfit = currentPrice * 0.94; // 6% take profit (for short)
    }

    // Build formula string
    const formula = `EMA(7)=${ema7.toFixed(6)} | EMA(99)=${ema99.toFixed(6)} | Gap=${crossoverStrength.toFixed(2)}% | 📊 SPOT`;

    // Create signal object
    const signal: MASignal = {
      coinId: pair.symbol,
      symbol: pair.symbol.replace("USDT", ""),
      name: pair.symbol.replace("USDT", ""),
      image: "", // No icons for Binance Spot
      signalType: crossover.type,
      signalName,
      timeframe,
      score,
      price: currentPrice,
      currentPrice,
      change1h: 0, // Not available from Binance
      change24h: parseFloat(pair.priceChangePercent),
      change7d: 0, // Not available from Binance
      volume24h: parseFloat(pair.quoteVolume),
      marketCap: 0, // Not available from Binance
      timestamp: Date.now(),
      crossoverTimestamp: Date.now(),
      candlesAgo: crossover.candlesAgo,
      entryPrice,
      stopLoss,
      takeProfit,
      volatility: Math.round(volatility * 100) / 100,
      formula,
      ema7,
      ema99,
      ema7Prev: crossover.ema7Prev,
      ema99Prev: crossover.ema99Prev,
      crossoverStrength: Math.round(crossoverStrength * 100) / 100,
    };

    return signal;
  } catch (error) {
    // Silently fail
    return null;
  }
}

/**
 * Get Binance Spot MA crossover signals
 */
export async function getBinanceSpotSignals(
  timeframe: string = "1h",
): Promise<MASignal[]> {
  try {
    // Check cache
    const cacheKey = timeframe;
    const cached = spotSignalsCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Using cached Binance Spot signals for ${timeframe}`);
      return cached.data;
    }

    console.log(
      `🔍 Scanning Binance Spot for MA crossovers on ${timeframe} timeframe...`,
    );

    // Fetch top pairs
    const pairs = await fetchTopSpotPairs();

    if (pairs.length === 0) {
      console.warn("⚠️ No Binance Spot pairs fetched");
      return [];
    }

    console.log(
      `📊 Analyzing ${pairs.length} high-volume Binance Spot pairs for crossovers...`,
    );

    // Process pairs in batches
    const batchSize = 20;
    const results: (MASignal | null)[] = [];
    let processedCount = 0;
    let successCount = 0;

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);

      console.log(
        `   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pairs.length / batchSize)} (${processedCount}/${pairs.length} pairs)...`,
      );

      const batchResults = await Promise.all(
        batch.map((pair) => processPair(pair, timeframe)),
      );

      results.push(...batchResults);
      processedCount += batch.length;
      successCount += batchResults.filter((r) => r !== null).length;

      // Rate limiting
      if (i + batchSize < pairs.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `   ✅ Processed ${processedCount} pairs, found data for ${successCount} pairs`,
    );

    // Filter valid signals
    const signals: MASignal[] = [];
    for (const signal of results) {
      if (signal) {
        signals.push(signal);
      }
    }

    // Sort by score (highest first), then by freshness
    signals.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.candlesAgo - b.candlesAgo;
    });

    console.log(
      `✅ Found ${signals.length} FRESH MA crossover signals on Binance Spot ${timeframe}`,
    );

    if (signals.length > 0) {
      const buySignals = signals.filter((s) => s.signalType === "BUY").length;
      const sellSignals = signals.filter((s) => s.signalType === "SELL").length;
      console.log(`   - BUY: ${buySignals} | SELL: ${sellSignals}`);
      console.log(
        `   - Top signals: ${signals
          .slice(0, 5)
          .map((s) => `${s.symbol}(${s.score})`)
          .join(", ")}`,
      );
      console.log(
        `   - Avg score: ${Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length)}`,
      );
    } else {
      console.log(
        `   ℹ️ No fresh crossovers detected. This is normal - crossovers are rare events.`,
      );
    }

    // Cache results
    spotSignalsCache.set(cacheKey, { data: signals, timestamp: now });

    return signals;
  } catch (error) {
    console.error("❌ Error calculating Binance Spot MA crossovers:", error);
    return [];
  }
}
