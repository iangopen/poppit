// Builds index.html (the whole game in one file) from src/. Run from anywhere: node tools/build.js
// Plain byte concatenation, so the output matches the old `cat` build exactly.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ORDER = ['artifacts.js', 'forge.js', 'econ.js', 'achievements.js', 'save.js', 'samples.js', 'audio.js', 'music.js', 'world.js', 'render.js', 'ui.js'];
const read = (f) => fs.readFileSync(path.join(root, 'src', f));

const all = Buffer.concat(ORDER.map(read));
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'all.js'), all);
try { new vm.Script(all.toString('utf8'), { filename: 'build/all.js' }); } // syntax check only, nothing runs
catch (e) { console.error(e.stack || String(e)); process.exit(1); }
fs.writeFileSync(path.join(root, 'index.html'), Buffer.concat([read('head.html'), all, read('tail.html')]));
console.log('built index.html');
