Session: CI confirmed on GitHub (green on main, red proof observed)

- Push: the CI commits were already on origin/main (git push said Everything up-to-date).
  Head is 1ef7e6d.
- Main run: CI run 40004144501 on that push, "completed success", job "check" 1m36s.
  The pages build and deployment run beside it also succeeded.
- Red check, observed: a branch push alone starts no run, because ci.yml fires only on push
  to main and on pull requests. I left the workflow alone and opened a draft PR (#1) from a
  throwaway branch with a one-line change to src/ui.js and no rebuild.
  - Run 40004747052 failed in 8 s at the step "index.html is up to date".
  - The log shows the diff stat "index.html | 1 +, 1 file changed, 1 insertion(+)" and the
    error "index.html is stale. Run npm run build and commit it."
  - The Test step was skipped after it.
- Cleanup: PR #1 closed unmerged, branch ci-red-check deleted on GitHub and locally,
  remote tracking ref pruned. Only main remains.
- Badge: the README badge SVG for main reads "passing".
- Annotations only, no failures: GitHub warns that actions/checkout@v4 and setup-node@v4
  target Node 20 (forced to Node 24), and that ubuntu-latest moves to Ubuntu 26. Not changed.
- No game code touched this session.
