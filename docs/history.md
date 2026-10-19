# Session history

## 2026-10-18: late-game measurement

- Replaced `build.sh` with `tools/build.js`, so the build runs in PowerShell. Its `index.html` output is byte-identical to the old build.
- Made `tools/sim32.js` seeded (mulberry32) and extended it:
  - it plays 6 Fresh Batch cycles per profile, with the game's real reset rules;
  - it applies the per-type spawn cap and the board prefill;
  - it reports per-cycle tables;
  - it adds a 25-minute player policy and tuning variants.
- Fixed `fmt` rollover at suffix boundaries, extended suffixes to Vg, and added tests.
- Wrote `docs/balance-report.md`, with three problems and options A/B/C. No balance change was applied.
