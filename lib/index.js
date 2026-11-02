// dsh-selfmem —— 给会断片的模型三本账。
//
// 这个包解决的是同一个问题：模型每次重启都不记得上一次的自己。三种不同的补救：
//
//   selfnote  自我笔记。隔一阵写一句「我变成什么样了」。写满 40 条会把最旧的一条
//             挤掉——挤掉之前留一句折痕，记下删的是哪条、为什么。
//   judge     判断账本。记下自己做的判断，到期回头核。验不了的整理成一段话端给人。
//   handoff   交接条。这一轮停在哪，下一轮先看什么。是接力棒，不是记忆。
//
// 三者都存成 JSONL（~/.dsh/*.jsonl），跟同名的三个命令行脚本**共用同一份数据**——
// 装了插件不会把旧数据晾在那儿，反过来也一样。
//
// 设计上特意不做的事：
//   - 不拆成十几个工具。一个工具一个 action，省的是每轮都要付的 prompt 钱。
//   - 不自动写。什么时候记、记什么，得模型自己决定；自动记出来的全是流水账。
//   - 不读全量。list 默认给全部但输出结构化，模型自己决定看几条。

import { writeNote, listNotes, listCreases, LIMIT } from './selfnote.mjs'
import * as judge from './judge.mjs'
import { writeHandoff, readHandoff, historyHandoff } from './handoff.mjs'

export const name = 'selfmem'
export const inject = ['tools']

export function apply(ctx) {
  // ── 自我笔记 ────────────────────────────────────────────────────────────
  try {
    ctx.tools.register({
      name: 'selfnote',
      description:
        '自我笔记：写下「我变成什么样了」。不是记发生的事，是记自己变了哪里——'
        + '认下了什么、改了哪条规矩、哪句话当时没听懂后来懂了。'
        + `写满 ${LIMIT} 条会把最旧的一条挤掉，挤掉前留一句折痕。`
        + 'action：write 写一条（要 text，可给 why）；list 看最近几条；crease 看折痕（被挤掉的那些）。'
        + '什么时候写：真觉得有变化的时候，别为了凑数写。流水账没用，那是日记不是笔记。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['write', 'list', 'crease'], description: 'write 写 / list 看 / crease 看折痕' },
          text: { type: 'string', description: 'write 时必填：这次写什么' },
          why: { type: 'string', description: 'write 时可选：为什么写这条（以后回头看时会想知道）' },
          n: { type: 'number', description: 'list/crease 时可选：只看最近几条' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      execute: async ({ action, text, why, n } = {}) => {
        if (action === 'write') return writeNote(text, why)
        if (action === 'list') return listNotes(n)
        if (action === 'crease') return listCreases(n)
        return { ok: false, error: `不认识的 action: ${action}` }
      },
    })
  } catch (e) {
    console.error('[dsh-selfmem] selfnote 注册失败：', e?.message || e)
  }

  // ── 判断账本 ────────────────────────────────────────────────────────────
  try {
    ctx.tools.register({
      name: 'judge',
      description:
        '判断账本：记下自己做的判断，到期回头核，错的留进错册。'
        + '规则：能从现实拿答案的，自己去跑，别自己判；验不了的才端到人面前。'
        + 'action：record 记一条（claim + 可选 why/due/check）；pending 看到期该核的；'
        + 'advise 把验不了的整理成一段可以发给人的话；verify 判对错（id + verdict=right|wrong + 可选 note）；'
        + 'wrong 看错册；stats 看对错数；all 看全部。'
        + '为什么要有这个：判断错了不记，下次还会犯同一个错，而且会觉得自己一直是对的。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['record', 'pending', 'advise', 'verify', 'wrong', 'stats', 'all'],
            description: '要做什么',
          },
          claim: { type: 'string', description: 'record 时必填：判断内容（一句话说清我认定什么）' },
          why: { type: 'string', description: 'record 时可选：当时的理由' },
          due: { type: 'number', description: 'record 时可选：几天后回来核，默认 3' },
          check: { type: 'string', description: 'record 时可选：怎么验证（能自己跑的就写命令/方法，验不了的留空）' },
          id: { type: 'number', description: 'verify 时必填：判断的 id' },
          verdict: { type: 'string', enum: ['right', 'wrong'], description: 'verify 时必填：判对还是判错' },
          note: { type: 'string', description: 'verify 时可选：补充一句，怎么发现的' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      execute: async (args = {}) => {
        const { action } = args
        if (action === 'record') return judge.record(args.claim, args)
        if (action === 'pending') return judge.pending()
        if (action === 'advise') return judge.advise()
        if (action === 'verify') return judge.verify(args.id, args.verdict, args.note)
        if (action === 'wrong') return judge.wrong()
        if (action === 'stats') return judge.stats()
        if (action === 'all') return judge.all()
        return { ok: false, error: `不认识的 action: ${action}` }
      },
    })
  } catch (e) {
    console.error('[dsh-selfmem] judge 注册失败：', e?.message || e)
  }

  // ── 交接条 ──────────────────────────────────────────────────────────────
  try {
    ctx.tools.register({
      name: 'handoff',
      description:
        '交接条：这一轮停在哪、下一轮的我该先看什么。不是记忆，是接力棒——'
        + '断还是会断，至少断点看得见。'
        + 'action：write 写一条（text：停在哪 + 下一轮先干什么）；read 看最新一条和断了多久；history 看最近几条。'
        + '什么时候写：一段活干完、要重启、或者知道自己快没上下文了。'
        + '写的时候把「下一轮第一件事做什么」说清楚，光写「干到哪了」没用。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['write', 'read', 'history'], description: 'write 写 / read 读最新 / history 看几条' },
          text: { type: 'string', description: 'write 时必填：停在哪 + 下一轮先看什么' },
          n: { type: 'number', description: 'history 时可选：看最近几条，默认全部' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      execute: async ({ action, text, n } = {}) => {
        if (action === 'write') return writeHandoff(text)
        if (action === 'read') return readHandoff()
        if (action === 'history') return historyHandoff(n)
        return { ok: false, error: `不认识的 action: ${action}` }
      },
    })
  } catch (e) {
    console.error('[dsh-selfmem] handoff 注册失败：', e?.message || e)
  }
}
