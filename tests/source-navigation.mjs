import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox'] });
try {
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', e => console.error('PAGE ERROR', e));
await page.goto('http://127.0.0.1:4381/');
const source = String.raw`# Heading target

Repeated sentence with **bold target** and *italic target* and [link target](https://example.com).

Repeated sentence with **bold target** and *italic target* and [link target](https://example.com).

> Quoted text here.
> Second quoted target line.
>
> - Nested list target.

1. First item.
2. Second item target.
   - Inner item target.

| Name | Value |
| --- | --- |
| Cell target | Other value |

Inline code: ` + '`code target`' + String.raw` and escaped \* literal &amp; entity target.

Before math $x + y$ after math target.

$$
x = \\frac{a}{b}
$$

` + '```python\nprint("code block target")\n```\n\n' + '마지막 한글 단어 확인 😀 emoji target.\n';
await page.locator('#editor').fill(source);
await page.waitForFunction(() => document.querySelector('#render-status').textContent === 'Up to date');
const frame = page.frames().find(f => f.url().includes('preview.html'));

async function clickText(needle, occurrence = 0) {
  const point = await frame.evaluate(({needle, occurrence}) => {
    const w = document.createTreeWalker(document.getElementById('content'), NodeFilter.SHOW_TEXT);
    let node, count = 0;
    while ((node = w.nextNode())) {
      let from = 0, at;
      while ((at = node.textContent.indexOf(needle, from)) >= 0) {
        if (count++ === occurrence) {
          const range = document.createRange(); range.setStart(node, at); range.setEnd(node, at + 1);
          range.startContainer.parentElement.scrollIntoView({block:'center'});
          const r = range.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        from = at + needle.length;
      }
    }
    throw new Error('Text not found: ' + needle);
  }, {needle, occurrence});
  const iframe = await page.locator('#preview').boundingBox();
  await page.mouse.dblclick(iframe.x + point.x, iframe.y + point.y);
  await page.waitForTimeout(50);
  return page.locator('#editor').evaluate(e => ({position:e.selectionStart, focused:document.activeElement === e, top:e.scrollTop}));
}

for (const [needle, occurrence] of [['Heading',0],['bold target',0],['bold target',1],['italic',1],['link target',1],['Second quoted',0],['Nested list',0],['Second item',0],['Inner item',0],['Cell target',0],['code target',0],['entity target',0],['after math target',0],['code block target',0],['한글',0],['emoji target',0]]) {
  const actual = await clickText(needle, occurrence);
  let expected = -1; for(let i = 0; i <= occurrence; i++) expected = source.indexOf(needle, expected + 1);

  assert(actual.focused, needle + ' focused');
  assert(Math.abs(actual.position - expected) <= 1, needle + ' expected ' + expected + ', got ' + actual.position);
}

// Math formulas navigate to their TeX source, including in Preview-only mode.
await page.locator('button[data-mode="preview"]').click();

await frame.locator('mjx-container').first().dblclick();
await page.waitForFunction(() => document.querySelector('#workspace').dataset.mode === 'split');
assert.equal(await page.locator('#workspace').getAttribute('data-mode'), 'split');
assert.equal(await page.locator('#editor').evaluate(e => e.selectionStart), source.indexOf('$x + y$'));
await frame.locator('mjx-container').nth(1).dblclick();
await page.waitForTimeout(100);
assert.equal(await page.locator('#editor').evaluate(e => e.selectionStart), source.indexOf('$$'));
await page.locator('#sync').uncheck();
await clickText('Cell target');
assert.equal(await page.locator('#editor').evaluate(e => e.selectionStart), source.indexOf('Cell target'));

// Task markers, entity escapes, and reference links retain exact source positions.
const tricky = '- [x] task with x target\n- [ ] task with space target\n\nLiteral `<span>&amp;</span>` target and &amp; entity.\n\n[reference target][ref]\n\n[ref]: https://example.com';
await page.locator('#editor').fill(tricky);
await page.waitForFunction(() => document.querySelector('#render-status').textContent === 'Up to date');
for (const needle of ['task with x', 'task with space', '<span>&amp;', 'reference target']) {
  const actual = await clickText(needle);
  assert(Math.abs(actual.position - tricky.indexOf(needle)) <= 1, needle + ' source position');
}

// Preserve OpenReview rendering byte-for-byte for varied Markdown.
const parity = await frame.evaluate(() => {
  const cases = ['- [x] done\n- [ ] pending', '> one\n> two\n\n> - nested', 'a &amp; b &lt; c &#128512;', '![x](https://example.com/x.png)', '<script>alert(1)</script>', 'A  \nB', '# Title\n\n**bold** and `code`', '| Left | Right |\n| --- | --- |\n| a | b |'];
  return cases.map(text => {
    const expected = renderOpenReview(text);
    const element = document.createElement('div');
    renderWithSourcePositions(text, element, 999);
    return {text, same: element.innerHTML === expected};
  });
});
assert(parity.every(x => x.same), JSON.stringify(parity));

// A stale preview must never move the cursor in a newer, unrendered draft.
await page.locator('#editor').evaluate(e => {
  e.value = 'New unsent draft';
  e.setSelectionRange(3, 3);

});
const staleRevision = await page.evaluate(() => revision);
await frame.evaluate(revision => parent.postMessage({type:'source-location', offset:10, revision}, location.origin), staleRevision);
await page.waitForTimeout(50);
assert.equal(await page.locator('#editor').evaluate(e => e.selectionStart), 3);

// Long wrapped paragraphs scroll to the clicked source without moving the preview.
const long = Array.from({length:100}, (_,i) => 'Paragraph ' + i + ': ' + 'long wrapped text '.repeat(20) + 'unique' + i).join('\n\n');
await page.locator('#editor').fill(long);
await page.waitForFunction(() => document.querySelector('#render-status').textContent === 'Up to date');
await page.locator('#sync').check();
const location = await clickText('unique85');
assert.equal(location.position, long.indexOf('unique85'));
assert(location.top > 1000);
const previewTop = await frame.evaluate(() => scrollY);
await page.waitForTimeout(700);
assert.equal(await frame.evaluate(() => scrollY), previewTop);
console.log('Passed text, math, repeated-content, rendering-parity, view-mode and scroll navigation checks.');
} finally {
  await browser.close();
}
