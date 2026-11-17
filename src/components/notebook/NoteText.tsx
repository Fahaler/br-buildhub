import { parseCheckLine } from '@/lib/checklist'
import { linkify } from './RichText'

type Item = { text: string; line: number; checked: boolean }
type Block = { type: 'p'; text: string } | { type: 'ul'; items: Item[] }

/** Разбивает ТЗ на абзацы и пункты списка («•», «-», «1.1.», «✓ …»). line — номер строки в исходном тексте. */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => { if (para.length) blocks.push({ type: 'p', text: para.join('\n') }); para = [] }
  text.split('\n').forEach((raw, line) => {
    const trimmed = raw.trimEnd()
    if (!trimmed.trim()) { flush(); return }
    const item = parseCheckLine(trimmed)
    if (item && item.text) {
      flush()
      const last = blocks[blocks.length - 1]
      const it = { text: item.text, line, checked: item.checked }
      if (last?.type === 'ul') last.items.push(it)
      else blocks.push({ type: 'ul', items: [it] })
    } else {
      para.push(trimmed)
    }
  })
  flush()
  return blocks
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border transition ${
        checked ? 'border-(--green) bg-(--green) text-black' : 'border-(--muted)/70 text-transparent'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
    </span>
  )
}

/**
 * ТЗ клиента в виде заметки: абзацы, пункты-списки и кликабельные ссылки.
 * checklist — пункты показываются галочками; onToggle — их можно отмечать (для админов).
 */
export default function NoteText({
  text, className, linkClassName, markerClassName, checklist = false, onToggle,
}: {
  text: string
  className?: string
  linkClassName?: string
  markerClassName?: string
  checklist?: boolean
  onToggle?: (line: number) => void
}) {
  return (
    <div className={`space-y-3 break-words ${className ?? ''}`}>
      {toBlocks(text).map((b, i) =>
        b.type === 'p' ? (
          <p key={i} className="whitespace-pre-line">{linkify(b.text, linkClassName)}</p>
        ) : checklist ? (
          <ul key={i} className="space-y-1">
            {b.items.map((it) => (
              <li key={it.line} className="flex items-start gap-2.5">
                {onToggle ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={it.checked}
                    aria-label={it.text}
                    onClick={() => onToggle(it.line)}
                    className="-m-1 mt-[0.1em] shrink-0 rounded-md p-1 hover:bg-(--panel-2) focus-visible:outline-2 focus-visible:outline-(--amber)"
                  >
                    <Box checked={it.checked} />
                  </button>
                ) : (
                  <span className="mt-[0.2em] shrink-0" title={it.checked ? 'Сделано' : 'Не сделано'}>
                    <Box checked={it.checked} />
                  </span>
                )}
                <span
                  className={`min-w-0 ${it.checked ? 'text-(--muted) line-through decoration-(--muted)/60' : ''} ${onToggle ? 'cursor-pointer' : ''}`}
                  onClick={onToggle ? (e) => { if (!(e.target as HTMLElement).closest('a')) onToggle(it.line) } : undefined}
                >
                  {linkify(it.text, linkClassName)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it) => (
              <li key={it.line} className="flex gap-2.5">
                <span aria-hidden className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 ${markerClassName ?? 'bg-current'}`} />
                <span className="min-w-0">{linkify(it.text, linkClassName)}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
