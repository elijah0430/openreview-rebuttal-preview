/* OpenReview web 1.15.42, 50c61b795383029ef03ce1f56d5b4e3759c4d599. AGPL-3.0-or-later. */
(function(){
const $ = () => { const el=document.createElement('div'); return {text(value){el.textContent=value;return this;},html(){return el.innerHTML;}}; };
const allowedHtmlTags = [
  // headings and block structure
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'div',
  'span',
  'blockquote',
  'pre',
  'hr',
  'section',
  'article',
  'header',
  'footer',
  'figure',
  'figcaption',
  'details',
  'summary',
  // inline text
  'a',
  'b',
  'i',
  'em',
  'strong',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'sub',
  'sup',
  'small',
  'mark',
  'code',
  'kbd',
  'samp',
  'var',
  'abbr',
  'cite',
  'q',
  'br',
  'wbr',
  // lists
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  // tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  // images
  'img',
]

DOMPurify.setConfig({ALLOWED_TAGS:allowedHtmlTags});
DOMPurify.addHook('afterSanitizeAttributes',(node)=>{if(node.tagName==='A'){node.setAttribute('target','_blank');node.setAttribute('rel','noopener noreferrer');} node.removeAttribute?.('style');node.removeAttribute?.('action');node.removeAttribute?.('formaction');});
  var setupMarked = function () {
    var renderer = new marked.Renderer()

    renderer.image = function ({ href, title, text }) {
      if (href.startsWith('/images/')) {
        var titleAttr = title ? 'title="' + title + '" ' : ''
        var classAttr = href.endsWith('_icon.svg') ? 'class="icon" ' : ''
        return '<img src="' + href + '" alt="' + text + '" ' + titleAttr + classAttr + '/>'
      }
      return $('<div />')
        .text('<img src="' + href + '" alt="' + text + '" title="' + title + '">')
        .html()
    }
    renderer.checkbox = function ({ checked }) {
      if (checked) return '[x]'
      return '[ ]'
    }
    renderer.html = function ({ text }) {
      return $('<div />').text(text).html()
    }

    // For details on options see https://marked.js.org/#/USING_ADVANCED.md#options
    marked.setOptions({
      baseUrl: null,
      breaks: false,
      gfm: true,
      headerIds: false,
      langPrefix: 'language-',
      mangle: false,
      renderer: renderer,
    })
  }

setupMarked();
window.renderOpenReview = (text) => DOMPurify.sanitize(marked.parse(text));
})();