# dsh-selfmem

给会断片的模型三本账。

## 为什么

模型每次重启都不记得上一次的自己。上下文一压缩，前面说过的话就只剩一句摘要。
这不是 bug，是没有外部存储的必然结果。

这个包不解决"记住"——它解决"断点看得见"。

三本账，各有各的用途：

| 账本 | 记什么 | 解决什么 |
|---|---|---|
| **自我笔记** `selfnote` | 我变成什么样了 | 隔一阵回头看你变了哪里，不是记流水账 |
| **判断账本** `judge` | 我认定过什么 | 到期回头核，错了进错册——防止一直觉得自己是对的 |
| **交接条** `handoff` | 这一轮停在哪 | 下一轮的你该先看什么。断还会断，至少断点看得见 |

## 装

DSH 的插件安装走 pnpm，命令是 `dsh plugin`，**`--profile` 不能省**（后面跟的 `add` 等是 pnpm 参数）：

```bash
# 从本地目录装（开发时用）
dsh plugin --profile desktop add link:C:/path/to/dsh-selfmem

# 从 GitHub 装
dsh plugin --profile desktop add github:wuying1630/dsh-selfmem

# 从 npm 装（发布之后）
dsh plugin --profile desktop add dsh-selfmem
```

把 `desktop` 换成你自己的 profile 名（`dsh web` 默认是 `web`）。

装的时候会自动把 `dsh-selfmem` 加进 `dsh.profile.bundles`。**没自动加的话手动补**：

```json
{ "dsh": { "profile": { "bundles": ["...", "dsh-selfmem"] } } }
```

装完重启 DSH，工具表里会多出 `selfnote` / `judge` / `handoff` 三个工具。

## 用

三个工具都是一个工具多个 `action`。

### 自我笔记

```
selfnote { action: "write", text: "认下了：翻车当场报，不埋", why: "因为埋过一次，第二次更难开口" }
selfnote { action: "list", n: 5 }
selfnote { action: "crease", n: 3 }   // 折痕：被挤掉的那些
```

上限 40 条。写满之后最旧的一条被挤掉，**挤掉前留一句折痕**——记下删的是哪条、为什么。
不留痕，删了就等于没长过。

### 判断账本

```
judge { action: "record", claim: "这个插件能用", why: "结构对", due: 3, check: "跑一遍测试" }
judge { action: "pending" }    // 到期该核的
judge { action: "advise" }     // 验不了的，整理成一段能直接发给人的话
judge { action: "verify", id: 1, verdict: "right" }
judge { action: "wrong" }      // 错册
judge { action: "stats" }
```

规则一条：**能从现实拿答案的，自己去跑，别自己判**。验不了的才端到人面前。

### 交接条

```
handoff { action: "write", text: "停在这：改完 bundles 但没重启。下一轮先重启再跑 check.mjs。" }
handoff { action: "read" }
handoff { action: "history", n: 5 }
```

写的时候把"下一轮第一件事做什么"说清楚，光写"干到哪了"没用。

## 数据

纯 JSONL，一行一条，坏了只坏一行：

```
~/.dsh/self-note.jsonl
~/.dsh/self-note-crease.jsonl
~/.dsh/judgments.jsonl
~/.dsh/handoff.jsonl
```

跟同名的三个命令行脚本**共用同一份数据**——装了插件不会把旧数据晾在那儿。

## 设计上特意不做的事

- **不拆成十几个工具**。一个工具一个 `action`，省的是每轮都要付的 prompt 钱。
- **不自动写**。什么时候记、记什么，得模型自己决定。自动记出来的全是流水账。
- **不删就完了**。挤掉一条必须留折痕，不然你不知道自己少了什么。

## License

MIT
