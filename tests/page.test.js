// The built index.html must be a standalone page: GitHub Pages serves it as is, with no wrapper around it.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const html = read('index.html');

test('index.html starts with <!doctype html> and an html element with a language', () => {
  assert.ok(/^<!doctype html>\r?\n<html lang="en">/i.test(html), JSON.stringify(html.slice(0, 40)));
  assert.ok(/<\/body>\s*<\/html>\s*$/.test(html), 'ends with </body></html>');
});
test('the charset meta comes first in the head, within the first 1024 bytes', () => {
  const i = html.indexOf('<meta charset="utf-8">');
  assert.ok(i > 0 && i < 1024 && i < html.indexOf('<title>'), 'at ' + i);
});
test('the viewport meta is there', () => {
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'));
});
test('the [hidden] rule is in the CSS', () => {
  assert.ok(/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/.test(html));
});
test('the head and the script sit inside <head> and <body>', () => {
  const h = html.indexOf('</head>'), b = html.indexOf('<body>');
  assert.ok(h > html.indexOf('</style>') && b > h && b < html.indexOf('<div id="app">') && html.lastIndexOf('<script>') > b);
});
test('index.html is built from the current src/head.html and src/tail.html (run npm run build)', () => {
  assert.ok(html.startsWith(read('src', 'head.html')) && html.endsWith(read('src', 'tail.html')));
});
