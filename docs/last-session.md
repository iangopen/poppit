Session: CI check on GitHub (not pushed yet: blocked)

BLOCKER
- git push to main was rejected: the stored GitHub token has no "workflow" scope, so it
  cannot create .github/workflows/ci.yml.
- Fix (either): run "gh auth refresh -s workflow" or make a new token with the workflow
  scope, then run "git push origin main". Or add ci.yml through the GitHub web UI.
- Because of this, nothing was pushed, so no Actions run exists. I could not confirm green
  and could not run the red-branch proof (it needs the same push). gh is not installed here.

Done locally (2 commits + docs commit, unpushed)
- .github/workflows/ci.yml: on push to main and pull requests. Node 22, no install (no
  dependencies). Build, fail if git diff shows index.html changed (prints diff stat), npm test,
  then npm run sim twice and diff.
- .gitattributes: LF for index.html, js, html, json, md, yml; mp3 binary. No history rewrite.
- README.md: CI badge on top.
- CLAUDE.md: new CI section. Pages setting and deploy untouched; no deploy step.

Browser: the page tests do not start Chrome (they read index.html as text), so nothing is
downloaded and nothing is skipped.
Sim: 12 s per run locally, so the determinism step stays in.

Verification (local)
- npm run build: built index.html
- 32 econ pass, 19 artifacts pass, 21 forge pass, 8 page pass
- harness: ALL PASSED
- away sim tests: 2 pass
- npm run sim twice: outputs identical

Conservative choices
- Node 22 (current LTS), pinned rather than "latest".
- Read-only permissions for the workflow; 10 minute timeout.
- Freshness check runs right after build, before tests.

Next step for Ian
- Fix the token scope, push, then ask me to confirm the run and do the throwaway-branch
  red check.
