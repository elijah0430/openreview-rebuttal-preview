# Rebuttal

A browser-local OpenReview Markdown preview. Source text never leaves the browser. The app does not submit to OpenReview. Drafts are saved to this origin's local storage, shared across tabs and not across browsers/devices.

## Build

Node 22+: `npm ci`, `npm run build`, `npm run dev`.

Open http://127.0.0.1:4381. Output is the static `docs/` directory, published by GitHub Pages from the main branch; all renderer dependencies are bundled locally. `source.zip` provides this source and upstream files.

## Fidelity

Reference: OpenReview web 1.15.42, commit `50c61b795383029ef03ce1f56d5b4e3759c4d599`, https://github.com/openreview/openreview-web

Adapted files under upstream/: setupMarked from client/view.js, allowedHtmlTags from lib/utils.js, lib/mathjax-config.js, styles/components/note-content.scss and styles/utils/{_mixins,_constants}.scss. OpenReview Copyright 2019–2026. This project is distributed under AGPL-3.0-or-later; see LICENSE.md. Changes: browser-local editor, isolated preview, removal of application-only dependencies, relative URL resolution to openreview.net and local packaging. Fonts are Noto Sans from Google Fonts (OFL-1.1).

The Markdown-enabled review/comment pipeline is Marked 15.0.6 → DOMPurify 3.4.17 with OpenReview tag policy and hooks → MathJax 3.2.2 with OpenReview configuration. No math pre-protection or automatic backslash fixes are used. GFM tables and strikethrough are enabled, HTML is escaped, ordinary images render as text, checkboxes render as [x]/[ ]. Local OpenReview /images/ assets retain the upstream exception. The published site's future versions, field configuration, viewport width and platform fonts can differ. Inline HTML shortcuts in unrelated OpenReview components are deliberately not used for review/comment fields.

Source CSS and MathJax configuration retain the upstream rules. The preview adds whitespace around the body and overflow handling; the application interface uses a separate stylesheet. UI labels are Korean; pasted content stays unchanged.
