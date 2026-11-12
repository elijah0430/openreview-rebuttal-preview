const $ = (id) => document.getElementById(id);
const editor = $('editor'), frame = $('preview');
const storageKey = 'rebuttal.openreview.draft.v1';
const example = String.raw`## Response to Reviewer 1

Thank you for the thoughtful feedback. We address your questions below.

> Could you clarify the scope of the claim?

**Our response.** We have revised the wording to make the claim more precise.

### 1. Clarification

- State the main point directly.
- Connect each claim to its supporting evidence.
- Keep the conditions and limitations explicit.

### 2. Mathematical notation

Inline math: $x + y = z$.

Display math uses the same left alignment as OpenReview:

$$
L = \\frac{1}{N} \\sum_{i=1}^{N} (y_i - \\hat{y}_i)^2
$$

### 3. A compact table

| Question | Response |
| :--- | :--- |
| Scope | Clarify the claim |
| Evidence | Refer to the relevant analysis |

Use **bold**, *italics*, and ${'`'}inline code${'`'} when helpful.

[OpenReview formatting guide](https://docs.openreview.net/how-to-guides/submissions-comments-reviews-and-decisions/how-to-add-formatting-to-reviews-or-comments)
`;
let ready = false, revision = 0, renderTimer, saveTimer, scrollTimer, noticeTimer, lastSourceScroll = 0;
let draft = null;
try { draft = localStorage.getItem(storageKey); } catch { showNotice('브라우저 저장소를 사용할 수 없습니다. 원문 복사나 .md 저장으로 보관하세요.', true); }
editor.value = draft ?? example;
$('save-status').textContent = draft === null ? '예시 문서' : '저장된 초안';
function showNotice(text, persistent = false) { clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').hidden = false; if (!persistent) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000); }
function counts() { const raw = editor.value; const words = raw.trim() ? raw.trim().split(/\s+/u).length : 0; $('counts').textContent = `${words.toLocaleString()} words · ${raw.length.toLocaleString()} characters`; }
function sendDraft() { if (!ready) return; revision++; $('render-status').textContent = '렌더링 중'; frame.contentWindow.postMessage({ type:'render', text:editor.value, revision, rootFontSize:window.innerWidth < 768 ? 14 : 16 }, location.origin); }
function save() { try { localStorage.setItem(storageKey, editor.value); $('save-status').textContent = '브라우저에 저장됨'; } catch { $('save-status').textContent = '저장 실패'; showNotice('자동 저장에 실패했습니다. 원문 복사나 .md 저장으로 보관하세요.', true); } }
function update() { counts(); clearTimeout(renderTimer); clearTimeout(saveTimer); $('save-status').textContent = '저장 중'; renderTimer = setTimeout(sendDraft, 140); saveTimer = setTimeout(save, 400); }
editor.addEventListener('input', update);
window.addEventListener('pagehide', () => { if ($('save-status').textContent !== '예시 문서') save(); });
window.addEventListener('message', (event) => { if (event.source !== frame.contentWindow) return; const m = event.data; if (!m || typeof m !== 'object') return; if (m.type === 'ready') { ready = true; sendDraft(); } if (m.type === 'rendered' && m.revision === revision) $('render-status').textContent = m.empty ? '입력을 기다리는 중' : '미리보기 최신'; if (m.type === 'error') { $('render-status').textContent = '렌더링 오류'; showNotice(m.message, true); } if (m.type === 'scroll' && $('sync').checked && performance.now() - lastSourceScroll > 140) { const max = editor.scrollHeight - editor.clientHeight; editor.scrollTop = m.ratio * Math.max(0, max); } });
editor.addEventListener('scroll', () => { if (!$('sync').checked || !ready) return; lastSourceScroll = performance.now(); clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { const max = editor.scrollHeight - editor.clientHeight; frame.contentWindow.postMessage({ type:'scroll', ratio:max > 0 ? editor.scrollTop / max : 0 }, '*'); }, 25); });
document.querySelectorAll('[data-mode]').forEach((button) => { if (button.tagName !== 'BUTTON') return; button.addEventListener('click', () => { $('workspace').dataset.mode = button.dataset.mode; document.querySelectorAll('button[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === button))); }); });
async function copyText() { try { await navigator.clipboard.writeText(editor.value); } catch { editor.focus(); editor.select(); if (!document.execCommand('copy')) { showNotice('텍스트를 선택했습니다. Ctrl+C 또는 ⌘C로 복사하세요.'); return; } } $('copy').textContent = '복사됨 ✓'; setTimeout(() => { $('copy').textContent = '원문 복사 ↗'; }, 1600); }
$('copy').addEventListener('click', copyText);
$('download').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([editor.value], { type:'text/markdown;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'rebuttal.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
let clearedDraft = null;
$('clear').addEventListener('click', () => { if (clearedDraft !== null && !editor.value) { editor.value = clearedDraft; clearedDraft = null; $('clear').textContent = '비우기'; } else { clearedDraft = editor.value; editor.value = ''; $('clear').textContent = '되돌리기'; } update(); editor.focus(); });
const exampleDialog = document.createElement('dialog');
exampleDialog.innerHTML = '<div class="dialog-top"><h2>Markdown 예시</h2><button class="text-button" aria-label="예시 닫기">닫기 ×</button></div><p>작성 중인 초안은 그대로 두고 문법을 확인하세요.</p><textarea aria-label="Markdown 문법 예시" readonly style="height:350px;display:block;resize:vertical"></textarea>';
exampleDialog.querySelector('textarea').value = example;
exampleDialog.querySelector('button').addEventListener('click', () => exampleDialog.close());
document.body.append(exampleDialog);
$('example').addEventListener('click', () => exampleDialog.showModal());
$('help-open').addEventListener('click', () => $('help').showModal()); $('about-open').addEventListener('click', () => $('about').showModal());
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); $('download').click(); } });
window.addEventListener('storage', (event) => { if (event.key === storageKey && event.newValue !== editor.value) showNotice('다른 탭에서 초안이 변경되었습니다. 현재 탭의 내용은 그대로입니다. 원문을 내려받아 보관하세요.', true); });
counts();
window.addEventListener('load', () => { if (!ready) { ready = true; sendDraft(); } });
window.addEventListener('resize', () => { clearTimeout(renderTimer); renderTimer = setTimeout(sendDraft, 180); });
