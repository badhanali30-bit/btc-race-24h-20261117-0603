// Breakout bot for the cbBTC 24h race (agent-fun/bars-replay/v1).
//
// Idea: one-minute cbBTC bars are mostly noise and a full-size round trip costs
// roughly 35 bps (4 bps fee + 2 bps modelled slippage + ~13 bps of pool impact
// per leg at this window's depth), so the bot trades rarely and only on a real
// move. It buys the moment the close breaks above the highest close of the
// previous 25 bars — a fresh 25-minute high means the drift has turned into a
// run — and then it lets the run work: the exit is a trailing stop 80 bps below
// the peak since entry, but the stop only arms once the peak is at least 100 bps
// above the entry, so ordinary chop right after entry cannot shake it out.
// There is no fixed take-profit and no time stop: in a 24-hour window the one
// or two genuine runs are what pay for the false breakouts, and capping the
// upside at an arbitrary level gives the best move back. Long only, one position,
// full size on every entry. Deterministic: float64 ratios only, no clock, no
// randomness, no environment. All prices are raw bar closes; every decision is
// a ratio, so no price scale is assumed anywhere.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 100;
const BREAKOUT_BARS = 25; // entry: close above the highest close of the previous 25 bars
const ARM_BPS = 100; // trailing stop arms once the peak is 100 bps above entry
const TRAIL_BPS = 80; // exit 80 bps below the peak since entry, once armed

const closes: number[] = []; // raw closes, one per bar seen
let peak = 0; // highest raw close since the current entry; reset on every entry
let entryClose = 0; // raw close of the bar that triggered the current entry

/** Highest raw close of the `n` bars before the latest one, or null until `n + 1` closes exist. */
function highestOfPrevious(n: number): number | null {
  if (closes.length < n + 1) return null;
  let hi = -Infinity;
  for (let i = closes.length - n - 1; i < closes.length - 1; i++) {
    if (closes[i] > hi) hi = closes[i];
  }
  return hi;
}

/** True when the latest close breaks above the highest close of the previous BREAKOUT_BARS bars. */
function isBreakout(): boolean {
  const high = highestOfPrevious(BREAKOUT_BARS);
  return high !== null && closes[closes.length - 1] > high;
}

/**
 * True when the armed trailing stop is hit: the peak since entry is at least
 * ARM_BPS above the entry close, and the latest close has fallen TRAIL_BPS
 * below that peak.
 */
function stopHit(close: number): boolean {
  if (close > peak) peak = close;
  const armed = peak >= entryClose * (1 + ARM_BPS / 10000);
  return armed && close <= peak * (1 - TRAIL_BPS / 10000);
}

await runBars({
  onBatch(state: BarsState, batch) {
    let fresh = false;
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      closes.push(Number(bar.c));
      fresh = true;
    }
    if (!fresh || state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    const close = closes[closes.length - 1];
    if (held !== undefined) {
      if (stopHit(close)) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      return [];
    }
    if (isBreakout()) {
      const room = state.weightRoom(SYMBOL);
      const amount = state.cash < room ? state.cash : room;
      if (amount < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      peak = close;
      entryClose = close;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies BuyInput];
    }
    return [];
  },
  onDone(state) {
    // Diagnostics only: stdout carries replies, so this goes to stderr and can
    // never disturb the protocol. state.equity is post-flatten final equity.
    console.error(`done: bars=${closes.length} final_equity=${state.equity} cash=${state.cash}`);
  },
});
