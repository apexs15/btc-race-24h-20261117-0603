# BTC dip-and-turn bot — btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/apexs15/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/apexs15/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute,
in a replay of its on-chain prices. Long only, one position, full-size entries.

## Strategy

Buy CBBTC when it is oversold against its short trend **and** turning up:

- close is at least **80 bps** below its **60-bar (1h)** simple moving average, and
- the **3-bar return is positive** (the dip is turning, not still falling).

Sell when the position is up **150 bps** on its entry cost, or down **500 bps**
(wide catastrophic stop only — the bounce needs room to run).

Each buy spends all cash; each sell empties the position. A round trip costs
~26 bps in fees/slippage/impact, so the 150 bps target clears it with margin.
Deterministic: no randomness, no wall clock, no files, no environment.

## Local dev grade (published dev window, 2026-11-16 06:03 UTC – 2026-11-17 06:03 UTC)

- Net PnL: **+27.63 USDC** on 1,000 USDC start
- Trades: **4 filled** (2 round trips, both winners)
- Max drawdown: **0.71%**
- Buy-and-hold on the same window: +1.07 USDC

The previous race's params (dip 130 bps below a 120-bar MA, 8-bar turn) make
zero trades on this window — this window's dips are shallower, so the trigger
has to be shallower too. The neighbourhood is a plateau, not a spike: TP
80–200 bps all positive, dip 60–80 bps positive, MA 60–120 positive.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript)
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, byte-for-byte
- `LICENSE` — MIT
