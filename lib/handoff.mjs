// 交接条：这一轮停在哪、下一轮的我该先看什么。
//
// 不是记忆，是接力棒。断还是会断，至少断点看得见。
import { load, append, ago } from './store.mjs'

const NAME = 'handoff'

export function writeHandoff(text) {
  const clean = String(text || '').trim()
  if (!clean) return { ok: false, error: '要写点什么' }
  append(NAME, { at: Date.now(), text: clean })
  return { ok: true, when: new Date().toLocaleString('zh-CN', { hour12: false }) }
}

export function readHandoff() {
  const rows = load(NAME)
  if (!rows.length) return { ok: true, empty: true }
  const last = rows[rows.length - 1]
  return { ok: true, empty: false, gap: ago(Date.now() - last.at), text: last.text, total: rows.length }
}

export function historyHandoff(n) {
  const rows = load(NAME)
  const take = Number(n) > 0 ? rows.slice(-Number(n)) : rows
  return {
    total: rows.length,
    items: take.map((r) => ({ gap: ago(Date.now() - r.at), text: r.text })),
  }
}
