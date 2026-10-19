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

## 2026-10-18: save export and import

- Added `src/save.js`: save codes (`POPPIT2:` + base64 + FNV-1a checksum), `SAVE_VERSION` and a `MIGRATIONS` table. The v1 → v2 logic moved into it unchanged.
- Hardened `loadState`: every field is clamped or defaulted, and newer versions are refused. A refused stored save is never overwritten.
- Added a Save section to Settings: copy, download, paste or open a file, then Load → Confirm. The replaced save is kept as `poppit.backup` and can be restored.
- Added a `pagehide` save, and an `awayBonus` guard against a NaN save time.

## 2026-10-18: standalone page

- `index.html` is now a complete document: doctype, charset and viewport metas, `<head>` / `<body>`, and a global `[hidden]` rule. Standards mode was measured against the old quirks-mode page at two sizes; the one visible regression (the book arrows) is fixed.
- An unreadable stored save is kept in `poppit.backup` (or `poppit.unreadable`) and can be recovered as text.
- The "Copy save code" button no longer wraps.
