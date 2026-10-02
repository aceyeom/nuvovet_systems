/**
 * A short, read-only code excerpt with minimal JS highlighting (comments,
 * strings, keywords, numbers). No library: a single-pass tokenizer.
 */

const KEYWORDS = new Set(['const', 'let', 'if', 'else', 'return', 'function', 'export', 'default', 'import', 'from', 'null', 'true', 'false', 'continue', 'for', 'of', 'new'])
const TOKEN = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g

function highlight(code) {
  const out = []
  let last = 0
  let m
  let k = 0
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    const [text, comment, str, num, word] = m
    if (comment) out.push(<span key={k++} className="pf-code__c">{text}</span>)
    else if (str) out.push(<span key={k++} className="pf-code__s">{text}</span>)
    else if (num) out.push(<span key={k++} className="pf-code__n">{text}</span>)
    else if (word && KEYWORDS.has(word)) out.push(<span key={k++} className="pf-code__k">{text}</span>)
    else out.push(text)
    last = m.index + text.length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

export default function CodeExcerpt({ file, code, label }) {
  return (
    <figure className="pf-code">
      <figcaption className="pf-code__file">{file}</figcaption>
      <pre className="pf-code__pre" tabIndex={0} aria-label={label}>
        <code>{highlight(code.trim())}</code>
      </pre>
    </figure>
  )
}
