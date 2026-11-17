import { linkify } from './RichText'

const BULLET = /^\s*(?:[•\-–—]|\*(?!\s*от)|\d+(?:\.\d+)*[.)])\s*/i
const IS_BULLET = /^\s*(?:[•\-–—]\s|\*(?!\s*от)\s|\d+(?:\.\d+)*[.)]\s)/i

type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/** Разбивает ТЗ на абзацы и пункты списка («•», «-», «1.1.»). */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => { if (para.length) blocks.push({ type: 'p', text: para.join('\n') }); para = [] }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }
    if (IS_BULLET.test(line)) {
      flush()
      const item = line.replace(BULLET, '')
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.items.push(item)
      else blocks.push({ type: 'ul', items: [item] })
    } else {
      para.push(line)
    }
  }
  flush()
  return blocks
}

/** ТЗ клиента в виде заметки: абзацы, пункты-списки и кликабельные ссылки. */
export default function NoteText({
  text, className, linkClassName, markerClassName,
}: { text: string; className?: string; linkClassName?: string; markerClassName?: string }) {
  return (
    <div className={`space-y-3 break-words ${className ?? ''}`}>
      {toBlocks(text).map((b, i) =>
        b.type === 'p' ? (
          <p key={i} className="whitespace-pre-line">{linkify(b.text, linkClassName)}</p>
        ) : (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 ${markerClassName ?? 'bg-current'}`} />
                <span className="min-w-0">{linkify(it, linkClassName)}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
