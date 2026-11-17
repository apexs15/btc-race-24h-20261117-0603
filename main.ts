/** BTC dip-and-turn bot for make.fun btc-race-24h-20261117-0603.
 *
 * Strategy (original, long-only, one position, full-size entries):
 *   Buy CBBTC when it is oversold against its short trend AND turning up:
 *     - close is at least 80 bps below its 60-bar (1h) simple moving average, and
 *     - the 3-bar return is positive (the dip is turning, not still falling).
 *   Sell when the position is up 150 bps on its entry cost, or down 500 bps
 *   (wide catastrophic stop only — the bounce needs room to run).
 *   Each buy spends all cash; each sell empties the position.
 *   A round trip costs ~26 bps in fees/slippage/impact, so the 150 bps target
 *   clears it with margin, and the dip+turn filter keeps us out of falling
 *   knives. Deterministic: no randomness, no wall clock, no files, no env.
 *   All basis-point ratios use floor division: BigInt `/` truncates toward
 *   zero, which would read a -79.3 bps dip as -79 and miss the signal — the
 *   tuning sweep floors, so the bot must floor too.
 *
 * Tuned on THIS race's published dev window (1,440 bars, 2026-11-16 06:03 UTC
 * to 2026-11-17 06:03 UTC, BTC only +48 bps, buy-and-hold +1.07 USDC):
 * net PnL +27.63 USDC on 1,000 USDC start, 4 filled trades (2 round trips,
 * both winners), max drawdown 0.71%. The previous race's params (dip 130
 * below a 120-bar MA, 8-bar turn) make ZERO trades on this window — this
 * window's dips are shallower, so the trigger has to be shallower too.
 * The neighbourhood is a plateau, not a spike: TP 80–200 all positive
 * (+16.52 to +27.63), dip 60–80 positive, MA 60–120 positive, turn 2–8
 * positive (+13.51 to +27.63). The stop never binds on this window (SL
 * 150–1000 all identical), so 500 bps is a pure catastrophic guard.
 */

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MA_BARS = 60;
const DIP_BPS = 80;
const TURN_BARS = 3;
const TAKE_PROFIT_BPS = 150;
const STOP_LOSS_BPS = 500;
const MAX_SLIPPAGE_BPS = 100;

const closes: bigint[] = [];
let windowSum = 0n;

/** Floor division: BigInt `/` truncates toward zero, but the strategy's
 *  thresholds were tuned against floor semantics (a dip of exactly -79.3 bps
 *  must read as -80, not -79). With a positive divisor this is just the
 *  truncating quotient minus one when the dividend is negative with a
 *  nonzero remainder. */
function divFloor(a: bigint, b: bigint): bigint {
  const q = a / b;
  return a % b !== 0n && a < 0n ? q - 1n : q;
}

function movingAverage(): bigint {
  return windowSum / BigInt(MA_BARS);
}

function onBatch(state: BarsState, _batch: Batch) {
  const close = state.close(SYMBOL);
  if (close === null) return [];
  closes.push(close);
  windowSum += close;
  if (closes.length > MA_BARS) windowSum -= closes[closes.length - 1 - MA_BARS]!;
  if (state.warmingUp) return [];
  if (closes.length < MA_BARS + 1) return [];

  const ma = movingAverage();
  const c = closes[closes.length - 1]!;
  const dipBps = divFloor((c - ma) * 10_000n, ma);
  const held = state.positions.get(SYMBOL);

  if (held === undefined) {
    if (dipBps <= -BigInt(DIP_BPS)) {
      const ago = closes[closes.length - 1 - TURN_BARS]!;
      const turnBps = divFloor((c - ago) * 10_000n, ago);
      if (turnBps > 0n && state.cash > 0n) {
        return [
          {
            side: 'buy' as const,
            symbol: SYMBOL,
            notional_quote_units: state.cash,
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          },
        ];
      }
    }
    return [];
  }

  // Holding: take profit or stop out against entry cost.
  const value = state.value(SYMBOL, held.qty);
  if (held.cost > 0n) {
    const retBps = divFloor((value - held.cost) * 10_000n, held.cost);
    if (retBps >= BigInt(TAKE_PROFIT_BPS) || retBps <= -BigInt(STOP_LOSS_BPS)) {
      return [
        {
          side: 'sell' as const,
          symbol: SYMBOL,
          qty: held.qty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }
  }
  return [];
}

await runBars({ onBatch });
