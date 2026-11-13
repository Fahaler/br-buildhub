import Link from 'next/link'

const VARIANTS = [
  { n: 3, href: '/test3', label: 'Мастерская' },
  { n: 4, href: '/test4', label: 'Бирки' },
  { n: 5, href: '/test5', label: 'Пульт' },
]

/** Плашка переключения между макетами (только на время выбора дизайна). */
export default function LabSwitcher({ current }: { current: 3 | 4 | 5 }) {
  return (
    <nav
      aria-label="Варианты дизайна"
      className="fixed bottom-3 left-1/2 z-[45] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-black/15 bg-white/90 p-1 font-sans text-[13px] text-neutral-900 shadow-lg backdrop-blur"
    >
      {VARIANTS.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          aria-current={current === v.n ? 'page' : undefined}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 transition ${current === v.n ? 'bg-neutral-900 text-white' : 'hover:bg-black/5'}`}
        >
          {v.n}<span className="hidden sm:inline"> · {v.label}</span>
        </Link>
      ))}
      <Link href="/" className="whitespace-nowrap rounded-full px-3 py-1.5 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900">
        <span className="sm:hidden">Старый</span><span className="hidden sm:inline">Текущий сайт</span>
      </Link>
    </nav>
  )
}
