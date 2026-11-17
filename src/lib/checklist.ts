// Чек-лист из ТЗ: строки с «•», «-», «*», «1.», «1.1.» — пункты.
// Отмеченный пункт хранится в тексте как та же строка с «✓ » в начале: «✓ • рабочие двери».

/** Маркер пункта (вместе с пробелом после него). «*От: 05.11.26» — не пункт. */
export const BULLET = /^\s*(?:[•\-–—]|\*(?!\s*от)|\d+(?:\.\d+)*[.)])\s*/i
const IS_BULLET = /^\s*(?:[•\-–—]\s|\*(?!\s*от)\s|\d+(?:\.\d+)*[.)]\s)/i
const CHECK = /^\s*✓\s?/

export type CheckLine = { checked: boolean; text: string }

/** Разбирает строку: пункт чек-листа или null. */
export function parseCheckLine(line: string): CheckLine | null {
  if (CHECK.test(line)) {
    const rest = line.replace(CHECK, '')
    return { checked: true, text: (IS_BULLET.test(rest) ? rest.replace(BULLET, '') : rest).trim() }
  }
  if (IS_BULLET.test(line)) return { checked: false, text: line.replace(BULLET, '').trim() }
  return null
}

/** Сколько пунктов отмечено из скольких. */
export function checkProgress(text: string | null | undefined) {
  let done = 0
  let total = 0
  for (const line of (text ?? '').split('\n')) {
    const item = parseCheckLine(line)
    if (!item || !item.text) continue
    total++
    if (item.checked) done++
  }
  return { done, total }
}

/** Переключает пункт в строке index. Снятая галочка возвращает исходный маркер («•» — если его не было). */
export function toggleCheckLine(text: string, index: number): string {
  const lines = text.split('\n')
  const line = lines[index]
  const item = line === undefined ? null : parseCheckLine(line)
  if (!item) return text
  if (item.checked) {
    const rest = line.replace(CHECK, '')
    const indent = line.match(/^\s*/)?.[0] ?? ''
    lines[index] = IS_BULLET.test(rest) ? indent + rest.trimStart() : `${indent}• ${rest.trimStart()}`
  } else {
    lines[index] = line.replace(/^(\s*)/, '$1✓ ')
  }
  return lines.join('\n')
}
