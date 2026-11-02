// 三个账本共用的读写。都是 JSONL —— 一行一条，坏了只坏一行，不会整本打不开。
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// 数据目录跟现有三个脚本保持一致，装了这个插件也不会把旧数据晾在那儿。
export const HOME = process.env.DSH_HOME || join(homedir(), '.dsh')

export function pathOf(name) {
  return join(HOME, `${name}.jsonl`)
}

export function load(name) {
  const p = pathOf(name)
  if (!existsSync(p)) return []
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function append(name, row) {
  mkdirSync(HOME, { recursive: true })
  appendFileSync(pathOf(name), JSON.stringify(row) + '\n')
}

export function saveAll(name, rows) {
  mkdirSync(HOME, { recursive: true })
  writeFileSync(pathOf(name), rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''))
}

export function nextId(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
}

export function ago(ms) {
  if (ms < 90_000) return '刚刚'
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} 分钟前`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} 小时前`
  return `${Math.round(ms / 86_400_000)} 天前`
}
