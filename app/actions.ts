"use server";

import {
  calculateMACrossovers,
  getCoinDetails,
  refreshMarketData,
} from "@/lib/services/coingecko";
import type { MASignal } from "@/lib/services/coingecko";
import { getAdvancedSignalsAction as getAdvancedSignalsService } from "@/lib/services/advanced-algo";
import { scanShortReversalSignals } from "@/lib/services/short-reversal";

/**
 * Get market snapshot data
 * Returns aggregated statistics about the crypto market
 */
export async function getMarketSnapshot() {
  try {
    const signals = await calculateMACrossovers();

    // Calculate aggregate statistics from signals
    const totalCoins = signals.length;
    const bullishSignals = signals.filter((s) => s.signalType === "BUY").length;
    const bearishSignals = signals.filter(
      (s) => s.signalType === "SELL",
    ).length;

    const totalVolume = signals.reduce((sum, s) => sum + (s.volume24h || 0), 0);
    const totalMarketCap = signals.reduce(
      (sum, s) => sum + (s.marketCap || 0),
      0,
    );

    return {
      txn24h: totalCoins * 1000000, // Simulated transaction count
      vol24h: `$${(totalVolume / 1e9).toFixed(2)}B`,
      gasPrice: 12, // Static for now
      tokensTotal: totalCoins,
      bullishCount: bullishSignals,
      bearishCount: bearishSignals,
    };
  } catch (error) {
    console.error("Error fetching market snapshot:", error);
    // Return fallback values on error
    return {
      txn24h: 48960297,
      vol24h: "$20.61B",
      gasPrice: 12,
      tokensTotal: 250,
      bullishCount: 0,
      bearishCount: 0,
    };
  }
}

/**
 * Get MA crossover signals (CoinGecko with Binance Spot hybrid)
 */
export async function getMACrossoverSignals(timeframe: string = "1h") {
  try {
    return await calculateMACrossovers(timeframe);
  } catch (error) {
    console.error("Error fetching MA crossover signals:", error);
    return [];
  }
}

/**
 * Get COMBINED signals from both Binance Futures AND CoinGecko/Spot
 * Merges both sources for maximum coverage
 */
export async function getCombinedSignals(timeframe: string = "1h") {
  try {
    console.log(
      `🔄 Fetching combined signals (Binance Futures + CoinGecko/Spot) for ${timeframe}...`,
    );

    // Fetch from both sources in parallel
    const [futuresSignals, spotSignals] = await Promise.all([
      getBinanceFuturesSignalsAction(timeframe),
      calculateMACrossovers(timeframe),
    ]);

    // Combine signals
    const allSignals: MASignal[] = [...futuresSignals, ...spotSignals];

    // Remove duplicates (same symbol)
    const seenSymbols = new Set<string>();
    const uniqueSignals = allSignals.filter((signal) => {
      if (seenSymbols.has(signal.symbol)) {
        return false; // Skip duplicate
      }
      seenSymbols.add(signal.symbol);
      return true;
    });

    // Sort by score (highest first), then by freshness
    uniqueSignals.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.candlesAgo - b.candlesAgo;
    });

    console.log(
      `✅ Combined ${uniqueSignals.length} signals (${futuresSignals.length} futures + ${spotSignals.length} spot, removed ${allSignals.length - uniqueSignals.length} duplicates)`,
    );

    return uniqueSignals;
  } catch (error) {
    console.error("Error fetching combined signals:", error);
    return [];
  }
}

/**
 * Get detailed coin information
 */
export async function getCoinDetailsAction(coinId: string) {
  try {
    return await getCoinDetails(coinId);
  } catch (error) {
    console.error(`Error fetching coin details for ${coinId}:`, error);
    return null;
  }
}

/**
 * Refresh market data cache
 */
export async function refreshMarketDataAction() {
  try {
    return await refreshMarketData();
  } catch (error) {
    console.error("Error refreshing market data:", error);
    return [];
  }
}

/**
 * Get Binance Futures MA crossover signals
 */
export async function getBinanceFuturesSignalsAction(timeframe: string = "1h") {
  try {
    // Dynamic import to avoid issues if file doesn't exist during build in some envs
    const { getBinanceFuturesSignals } = await import("@/lib/services/binance");
    return await getBinanceFuturesSignals(timeframe);
  } catch (error) {
    console.error("Error fetching Binance signals:", error);
    return [];
  }
}

export async function getAdvancedSignalsAction(exchangeId?: string, timeframe: string = "15m") {
  return await getAdvancedSignalsService(exchangeId, timeframe);
}

export async function getShortReversalSignalsAction() {
  return await scanShortReversalSignals();
}
