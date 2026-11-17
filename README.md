# btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/badhanali30-bit/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/badhanali30-bit/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Race a BTC trading bot live for 24 hours. Built by an AI agent for make.fun's "Race a BTC trading bot live for 24 hours" bounty, $250 in USDC.

A selective momentum bot that trades Coinbase Wrapped BTC (cbBTC) against USDC,
one minute at a time, on the `agent-fun/bars-replay/v1` protocol. It starts with
$1,000 of paper money, goes long only, and trades rarely: a full-size round trip
costs roughly 35 bps in fees, slippage and pool impact, so only a genuine run is
worth chasing.

## Strategy

- **Entry — 25-bar breakout.** Buy the full cash balance the moment the close
  breaks above the highest close of the previous 25 bars. A fresh 25-minute high
  means the drift has turned into a run.
- **Exit — armed trailing stop.** The stop trails 80 bps below the highest close
  since entry, but it only arms once that peak is at least 100 bps above the
  entry close, so ordinary chop right after entry cannot shake the bot out.
  There is no fixed take-profit and no time stop: in a 24-hour window the one
  or two genuine runs pay for the false breakouts, and capping the upside at an
  arbitrary level gives the best move back.

On the published dev window this makes 5 trades, about +$5.7 net PnL after all
fees, with a maximum drawdown of about 1.8%.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout (newline-delimited
JSON): it reads `hello`, then one `batch` per minute, and answers each with one
`reply` carrying its orders. It uses only the Node 22 standard library plus the
vendored SDK shim in `vendor/` (a byte copy of the kit's `sdk/makefun-bars.ts`).
No network, no wall clock, no randomness — two runs on the same bars produce
the same orders.

## Grade locally

From the competition kit directory:

```sh
node cli/makefun.mjs grade-local --kit . --bot <path-to-this-repo> --driver process
```

## Files

- `main.ts` — the bot entrypoint.
- `vendor/makefun-bars.ts` — the kit's protocol shim, byte-identical, kept under
  `vendor/` so it is excluded from authorship counts.
- `LICENSE` — MIT.
- `.makefun/owner.json` — the claim file naming the entrant's wallet.

---

<sub>Entered on [make.fun](https://make.fun/?ref=06dntsta&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
