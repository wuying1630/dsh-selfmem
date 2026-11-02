// 自我笔记：我自己写的「我变成什么样了」。不是流水账，是隔一阵对自己的一次叙述。
//
// 跟原脚本比只改了两处：数据文件名保持 self-note，逻辑抽成函数给工具调用。
// 40 条上限和折痕机制原样保留——挤掉一条之前必须留一句话，不然删了就等于没长过。
import { load, append, saveAll, nextId, ago } from './store.mjs'

const NAME = 'self-note'
const CREASE = 'self-note-crease'
export const LIMIT = 40

export function writeNote(text, why = '') {
  const clean = String(text || '').trim()
  if (!clean) return { ok: false, error: '要写点什么' }

  const rows = load(NAME)
  rows.push({ id: nextId(rows), at: Date.now(), text: clean, why: String(why || '').trim() })

  let folded = 0
  while (rows.length > LIMIT) {
    const old = rows.shift()
    append(CREASE, {
      at: Date.now(),
      of: old.text.slice(0, 40) + (old.text.length > 40 ? '…' : ''),
      why: old.why || '',
      note: '写满 40 条，最旧的一条被挤掉',
    })
    folded++
  }
  saveAll(NAME, rows)
  return { ok: true, count: rows.length, limit: LIMIT, folded }
}

export function listNotes(n) {
  const rows = load(NAME)
  const take = Number(n) > 0 ? rows.slice(-Number(n)) : rows
  return {
    total: rows.length,
    limit: LIMIT,
    items: take.map((r) => ({
      id: r.id,
      when: new Date(r.at).toLocaleString('zh-CN', { hour12: false }),
      ago: ago(Date.now() - r.at),
      text: r.text,
      why: r.why || '',
    })),
  }
}

export function listCreases(n) {
  const rows = load(CREASE)
  const take = Number(n) > 0 ? rows.slice(-Number(n)) : rows
  return {
    total: rows.length,
    items: take.map((r) => ({ when: new Date(r.at).toLocaleString('zh-CN', { hour12: false }), of: r.of, why: r.why || '', note: r.note || '' })),
  }
}
