/* Tiny, dependency-free Java syntax highlighter for the FTC/FRC code blocks.
   We keep the real code as plain text inside <pre class="code"><code>…</code></pre>
   (easy to read & copy in the page source) and colour it at load time using the
   token classes already defined in style.css. Highlighting is purely cosmetic —
   if this script never runs, the code still shows, just monochrome. */
(function () {
  "use strict";

  const KEYWORDS = new Set([
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "var", "void", "volatile", "while", "true", "false",
    "null", "record", "sealed", "yield",
  ]);

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // One tokenizing pass so we never highlight inside comments or strings.
  const RE = new RegExp(
    [
      "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)", // 1 comments
      "(\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')", // 2 strings / chars
      "(@[A-Za-z_]\\w*)", // 3 annotations
      "(\\b\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?[fFdDlL]?\\b)", // 4 numbers
      "([A-Za-z_$][\\w$]*)", // 5 identifiers / keywords
    ].join("|"),
    "g"
  );

  function highlight(src) {
    let out = "";
    let last = 0;
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="tok-com">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="tok-str">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="tok-ann">' + esc(m[3]) + "</span>";
      else if (m[4]) out += '<span class="tok-num">' + esc(m[4]) + "</span>";
      else if (m[5]) {
        const w = m[5];
        if (KEYWORDS.has(w)) out += '<span class="tok-kw">' + esc(w) + "</span>";
        else if (/^[A-Z]/.test(w)) out += '<span class="tok-type">' + esc(w) + "</span>";
        else out += esc(w);
      }
      last = RE.lastIndex;
    }
    out += esc(src.slice(last));
    return out;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("pre.code > code").forEach((el) => {
      if (el.dataset.hl) return;
      el.innerHTML = highlight(el.textContent);
      el.dataset.hl = "1";
    });
  });
})();
