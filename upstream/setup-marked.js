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
