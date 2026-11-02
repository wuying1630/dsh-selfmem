// 判断账本：记下自己做的判断，到期回头核，错的留进错册。
//
// 规则沿用原来那版：能从现实拿答案的，自己去跑，别自己判；验不了的才端到人面前。
// 数据在 ~/.dsh/judgments.jsonl，跟原脚本同一份。
import { load, append, saveAll, nextId } from './store.mjs'

const NAME = 'judgments'
const DAY = 24 * 60 * 60 * 1000

export function record(claim, opts = {}) {
  const clean = String(claim || '').trim()
  if (!clean) return { ok: false, error: '没有判断内容' }
  const why = String(opts.why || '').trim()
  const check = String(opts.check || '').trim()
  const due = Number(opts.due) > 0 ? Number(opts.due) : 3
  const rows = load(NAME)
  const id = nextId(rows)
  const now = Date.now()
  append(NAME, {
    id,
    at: now,
    claim: clean,
    why,
    check,
    dueAt: now + due * DAY,
    status: 'pending',
    verdict: '',
    verdictAt: 0,
  })
  return { ok: true, id, dueDays: due, hasCheck: Boolean(check) }
}

export function pending() {
  const now = Date.now()
  const rows = load(NAME).filter((r) => r.status === 'pending' && r.dueAt <= now)
  return {
    total: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      claim: r.claim,
      why: r.why || '',
      check: r.check || '',
      overdueDays: Math.floor((now - r.dueAt) / DAY),
    })),
  }
}

export function advise() {
  const now = Date.now()
  const rows = load(NAME).filter((r) => r.status === 'pending' && r.dueAt <= now && !r.check)
  return {
    total: rows.length,
    items: rows.map((r) => ({ id: r.id, claim: r.claim, why: r.why || '' })),
    // 这段话可以原样发给人的
    text: rows.length
      ? '有几条判断我自己验不了，你帮我核一下：\n' + rows.map((r) => `\n#${r.id} ${r.claim}${r.why ? `\n我当时的理由：${r.why}` : ''}\n对不对？`).join('\n')
      : '',
  }
}

export function all() {
  const rows = load(NAME).slice().reverse()
  return {
    total: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      claim: r.claim,
      verdict: r.verdict || '',
    })),
  }
}

export function verify(id, verdict, note = '') {
  const n = Number(id)
  if (!n || !['right', 'wrong'].includes(verdict)) return { ok: false, error: '用法: verify <id> right|wrong ["补充"]' }
  const rows = load(NAME)
  const row = rows.find((r) => r.id === n)
  if (!row) return { ok: false, error: `没有这条: ${n}` }
  row.status = verdict
  row.verdict = String(note || '').trim()
  row.verdictAt = Date.now()
  saveAll(NAME, rows)
  return { ok: true, id: n, status: verdict, note: row.verdict }
}

export function wrong() {
  const rows = load(NAME).filter((r) => r.status === 'wrong')
  return {
    total: rows.length,
    items: rows.map((r) => ({ id: r.id, claim: r.claim, why: r.why || '', verdict: r.verdict || '' })),
  }
}

export function stats() {
  const rows = load(NAME)
  const right = rows.filter((r) => r.status === 'right').length
  const bad = rows.filter((r) => r.status === 'wrong').length
  const pend = rows.filter((r) => r.status === 'pending').length
  return {
    total: rows.length,
    right,
    wrong: bad,
    pending: pend,
    accuracy: right + bad > 0 ? Math.round((right / (right + bad)) * 100) : null,
  }
}
