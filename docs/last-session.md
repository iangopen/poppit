Session: /doctor health check

- Install: native 2.1.309 is current and first on PATH. A stale npm global 2.1.131 sits in
  /usr/local/lib/node_modules (root-owned). Harmless; remove it yourself if you like with
  "! npm -g uninstall @anthropic-ai/claude-code" (may need sudo). I did not touch it.
- Settings files all parse. No hooks are slow (SessionStart 84-239 ms). No denials recorded.
- Changed in ~/.claude/settings.json: plugins design@synced and napkin-math@synced set to
  false (0 uses), and permissions.defaultMode set to "auto".
  - Undo: delete those keys, or ask me. Backup of the old file is in the temp dir.
- Changed in the repo (uncommitted, review with git diff): the dated "State: real and
  verified (2026-10-21)" section moved from CLAUDE.md to the end of docs/history.md,
  word for word. CLAUDE.md went from 57,247 to about 47,600 chars (about 2.4k est. tokens
  saved per session). It is still over the ~40k warning size; the Artifacts and Forge
  detail (about 20k chars) is the only big block left to move, and I left it for you.
- /usage tips (advice): end long sessions, /clear when switching tasks, /context to see usage.
- No game code changed; index.html rebuild matches the committed one.
