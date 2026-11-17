import { Fragment, type ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s)]+)/g

function labelFor(href: string) {
  try {
    const u = new URL(href)
    if (u.hostname.includes('steamcommunity.com')) return 'Steam Workshop'
    return u.hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

/** Делает ссылки в тексте кликабельными (короткая подпись вместо длинного URL). */
export function linkify(text: string, linkClassName?: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={linkClassName} onClick={(e) => e.stopPropagation()}>
        {labelFor(part)} ↗
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

/** Текст описания с сохранением переносов строк и кликабельными ссылками. */
export default function RichText({ text, className, linkClassName }: { text: string; className?: string; linkClassName?: string }) {
  return <p className={`whitespace-pre-line break-words ${className ?? ''}`}>{linkify(text, linkClassName)}</p>
}
