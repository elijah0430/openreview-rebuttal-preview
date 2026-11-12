const content = document.getElementById('content');
let latest = null, busy = false, externalScrollAt = 0;
function tell(data) { parent.postMessage(data, '*'); }
async function render() {
  if (busy || !latest) return;
  busy = true;
  while (latest) {
    const job = latest; latest = null;
    try {
      if (!window.marked || !window.DOMPurify) throw new Error('The Markdown renderer could not load. Please refresh the page.');
      if (!window.MathJax?.startup?.promise) throw new Error('The math renderer could not load. Please refresh the page.');
      await MathJax.startup.promise;
      document.documentElement.style.fontSize = (job.rootFontSize === 14 ? 14 : 16) + 'px';
      MathJax.typesetClear([content]);
      MathJax.texReset();
      content.innerHTML = window.renderOpenReview(job.text);
      content.querySelectorAll('a[href]').forEach((a) => { const href = a.getAttribute('href'); if (href && !/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith('#')) a.href = new URL(href, 'https://openreview.net/').href; });
      content.querySelectorAll('img[src^="/images/"]').forEach((img) => { img.src = new URL(img.getAttribute('src'), 'https://openreview.net').href; });
      document.getElementById('empty').hidden = !!job.text.trim();
      await MathJax.typesetPromise([content]);
      tell({ type:'rendered', revision:job.revision, empty:!job.text.trim() });
    } catch (e) { tell({ type:'error', message:e.message }); }
  }
  busy = false;
}
window.addEventListener('message', (event) => { if (event.source !== parent) return; const m = event.data; if (!m) return; if (m.type === 'render' && typeof m.text === 'string') { latest = m; render(); } if (m.type === 'scroll') { externalScrollAt = performance.now(); const max = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, Math.max(0, max) * Math.min(1, Math.max(0, m.ratio))); } });
window.addEventListener('scroll', () => { if (performance.now() - externalScrollAt < 160) return; const max = document.documentElement.scrollHeight - innerHeight; tell({ type:'scroll', ratio:max > 0 ? scrollY / max : 0 }); }, { passive:true });
tell({ type:'ready' });
