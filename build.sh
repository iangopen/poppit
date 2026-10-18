#!/bin/bash
# Builds index.html (the whole game in one file) from src/. Run from anywhere.
set -e
cd "$(dirname "$0")"
mkdir -p build
cat src/econ.js src/samples.js src/audio.js src/music.js src/world.js src/render.js src/ui.js > build/all.js
node --check build/all.js
cat src/head.html build/all.js src/tail.html > index.html
echo "built index.html"
