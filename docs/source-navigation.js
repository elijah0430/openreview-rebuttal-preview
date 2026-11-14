/* Keep source positions beside the rendered DOM; the preview HTML stays unchanged. */
(function () {
  const nodePositions = new WeakMap();
  const mathPositions = new WeakMap();
  const textOffsets = new WeakMap();
  const mathItems = new WeakMap();
  let originalText = '', originalPositions = [], mathHookInstalled = false;
  let renderedRevision = 0;

  function locate(text, parent, positions, from = 0) {
    const exact = parent.indexOf(text, from);
    if (exact >= 0) return { positions: positions.slice(exact, exact + text.length), end: exact + text.length };
    // Block quotes and list items remove indentation and prefixes on each line.
    const result = [];
    let cursor = from;
    for (const line of text.split(/(?<=\n)/u)) {
      const found = parent.indexOf(line, cursor);
      if (found >= 0) {
        for (let i = found; i < found + line.length; i++) result.push(positions[i]);
        cursor = found + line.length;
      } else {
        for (const char of line) {
          const next = parent.indexOf(char, cursor);
          const at = next < 0 ? Math.min(cursor, parent.length - 1) : next;
          // Source offsets and browser selections both use UTF-16 code units.
          for (let i = 0; i < char.length; i++) result.push(positions[at + i] ?? positions[at] ?? 0);
          if (next >= 0) cursor = next + char.length;
        }
      }
    }
    return { positions: result, end: cursor };
  }

  function annotate(tokens, parent, positions) {
    let cursor = 0;
    for (const token of tokens) {
      const raw = token.raw ?? token.text ?? '';
      const found = locate(raw, parent, positions, cursor);
      cursor = found.end;
      token.sourcePositions = found.positions;
      if (token.tokens) annotate(token.tokens, raw, found.positions);
      if (token.items) annotate(token.items, raw, found.positions);
      if (token.type === 'table') {
        let cellCursor = 0;
        for (const cell of [...token.header, ...token.rows.flat()]) {
          const cellLocation = locate(cell.text, raw, found.positions, cellCursor);
          cellCursor = cellLocation.end;
          annotate(cell.tokens, cell.text, cellLocation.positions);
        }
      }
    }
  }

  const scratch = document.createElement('template');
  function plain(html) { scratch.innerHTML = html; return scratch.content.textContent; }
  function visiblePositions(text, token) {
    const raw = token.raw ?? token.text ?? '';
    const source = token.sourcePositions ?? [];
    const exact = raw.indexOf(text);
    if (exact >= 0) return source.slice(exact, exact + text.length);
    // Marked prepends a checkbox label when rendering a task list item.
    const checkbox = text.match(/^\[[ x]\] /)?.[0];
    if (checkbox && !raw.startsWith(checkbox)) return [
      ...Array(checkbox.length).fill(source[0]),
      ...visiblePositions(text.slice(checkbox.length), token)
    ];
    // Decode entities before alignment, retaining their original source position.
    let decoded = '', positions = [];
    for (let i = 0; i < raw.length;) {
      const entity = raw.slice(i).match(/^&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/i)?.[0];
      const value = entity ? plain(entity) : raw[i];
      decoded += value;
      for (let j = 0; j < value.length; j++) positions.push(source[i] ?? 0);
      i += entity ? entity.length : 1;
    }
    return locate(text, decoded, positions).positions;
  }

  window.renderWithSourcePositions = function (text, target, revision) {
    const tokens = marked.lexer(text);
    annotate(tokens, text, Array.from({ length: text.length }, (_, i) => i));
    const chunks = [];
    const base = marked.defaults.renderer;
    const renderer = Object.create(base);
    for (const name of ['text', 'codespan', 'image', 'html', 'code']) {
      renderer[name] = function (token) {
        const html = base[name].call(this, token);
        // A block text token may render its own inline tokens recursively.
        if (!token.tokens?.length) {
          const value = plain(html);
          if (value) chunks.push({ text: value, positions: visiblePositions(value, token) });
        }
        return html;
      };
    }
    const parser = new marked.Parser({ ...marked.defaults, renderer });
    target.innerHTML = DOMPurify.sanitize(parser.parse(tokens));
    const allText = target.textContent;
    originalText = allText;
    const positions = new Array(allText.length);
    let cursor = 0;
    for (const chunk of chunks) {
      const at = allText.indexOf(chunk.text, cursor);
      if (at < 0) continue;
      for (let i = 0; i < chunk.text.length; i++) positions[at + i] = chunk.positions[i];
      cursor = at + chunk.text.length;
    }
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let node, offset = 0;
    while ((node = walker.nextNode())) {
      nodePositions.set(node, positions.slice(offset, offset + node.length));
      textOffsets.set(node, offset);
      offset += node.length;
    }
    originalPositions = positions;
    if (!mathHookInstalled) {
      // Capture TeX offsets after MathJax finds formulas, before it replaces text nodes.
      MathJax.startup.document.addRenderAction('rememberSource', 15, (doc) => {
        for (const item of doc.math) {
          const start = textOffsets.get(item.start.node);
          const end = textOffsets.get(item.end.node);
          if (start !== undefined && end !== undefined) mathItems.set(item, {
            offset: originalPositions[start + item.start.n],
            end: end + item.end.n
          });
        }
      });
      mathHookInstalled = true;
    }
    renderedRevision = revision;
  };

  window.rememberMathSourcePositions = function (target) {
    const roots = new WeakMap();
    for (const item of MathJax.startup.document.getMathItemsWithin(target)) {
      const info = mathItems.get(item);
      if (info && item.typesetRoot) {
        mathPositions.set(item.typesetRoot, info.offset);
        roots.set(item.typesetRoot, info);
      }
    }
    // MathJax splits text nodes around formulas. Reattach the sidecar positions.
    let cursor = 0;
    function visit(node) {
      const formula = roots.get(node);
      if (formula) { cursor = formula.end; return; }
      if (node.nodeType === Node.TEXT_NODE) {
        const at = originalText.indexOf(node.data, cursor);
        if (at >= 0) {
          nodePositions.set(node, originalPositions.slice(at, at + node.length));
          cursor = at + node.length;
        }
      } else for (const child of node.childNodes) visit(child);
    }
    visit(target);
  };

  document.getElementById('content').addEventListener('dblclick', (event) => {
    let offset;
    const math = event.target.closest?.('mjx-container');
    if (math) offset = mathPositions.get(math);
    else {
      const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY);
      const range = !caret && document.caretRangeFromPoint?.(event.clientX, event.clientY);
      const node = caret?.offsetNode ?? range?.startContainer;
      const index = caret?.offset ?? range?.startOffset;
      const positions = nodePositions.get(node);
      offset = positions?.[Math.min(index, positions.length - 1)];
    }
    if (!Number.isInteger(offset)) return;
    event.preventDefault();
    event.stopPropagation();
    parent.postMessage({ type: 'source-location', offset, revision: renderedRevision }, location.origin);
  }, true);
})();
