# 学术模式开关 · dsh-academic-switch

[![test](https://github.com/FelixJiashengFu/dsh-academic-switch/actions/workflows/test.yml/badge.svg)](https://github.com/FelixJiashengFu/dsh-academic-switch/actions/workflows/test.yml)

> 输入框旁一枚深蓝色开关。打开后，每个来源核查三遍，每份交付检查三遍逻辑，交付前自动检查有没有附核查记录，推理强度与输出预算拉到模型上限。

- **关**：一切照旧，插件只在后台待命。
- **开**：从下一条消息起，对所有会话（包括子代理）生效：系统提示加入学术身份与学术纪律，每一步模型调用推到该模型支持的上限，较长的回复如果没有「核查记录」，会在本轮结束前被退回补查一次。

> 用 Claude Code、Codex 或 Antigravity？跳到「在 Claude Code、Codex、Antigravity 里使用」。那边只装学术纪律技能，没有开关、全局常开和交付前核查闸门。

## 安装（DeepSeek Harness）

在 DeepSeek Harness 的 **插件 → 添加插件** 里填入本仓库地址，点 **安装**，装好后点 **立即启用**：

```
https://github.com/FelixJiashengFu/dsh-academic-switch
```

输入框左侧随即出现带学位帽图标的「学术」开关。升级：在插件页卸载后，用同样的方式重新安装。

本地开发：克隆本仓库后，在 **添加插件** 里填本目录的绝对路径，或让 agent 调用插件管理器（不要手改 profile 的 `package.json`）：

```
plugin_manager action=install_bundle target=<本目录绝对路径>
```

卸载：在插件页卸载，或 `plugin_manager action=remove_bundle target=dsh-academic-switch`。

## 在 Claude Code、Codex、Antigravity 里使用

同一个仓库也是这三个工具的安装源，装上后得到「学术模式」技能（`academic-mode`）：任务匹配技能描述，或你手动调用它时，整个会话按下文的学术纪律工作。技能文本和 DSH 版逐字相同，由 `lib/prompt.js` 生成（`npm run sync-skill`）。

技能只带来提示词纪律。输入框开关、全局常开、交付前核查闸门、推理强度与输出预算拉满，依赖 DSH 的插件接口，这三个工具里没有。需要更高的推理强度时，在各工具自己的设置里调。

### Claude Code

```
/plugin marketplace add FelixJiashengFu/dsh-academic-switch
/plugin install academic-mode@felixfu-plugins
```

在终端里用 `claude plugin marketplace add …` 和 `claude plugin install …` 同样可行；Claude Code 2.1.275 或更高版本也可以一步完成：`/plugin install academic-mode --marketplace FelixJiashengFu/dsh-academic-switch`。装好后重启会话或运行 `/reload-plugins`，手动调用用 `/academic-mode:academic-mode`。

### Codex

```
codex plugin marketplace add FelixJiashengFu/dsh-academic-switch
codex plugin add academic-mode@felixfu-plugins
```

新开会话后生效。输入 `$` 或运行 `/skills` 可以手动选用。只想要技能、不想装插件，见下面的「手动安装」。

### Antigravity

Antigravity 读项目里的 `.agents/skills/`。在你的项目目录里运行：

```
npx skills add FelixJiashengFu/dsh-academic-switch --skill academic-mode -a antigravity
```

或把 `plugins/academic-mode/skills/academic-mode` 整个文件夹复制到 `<项目>/.agents/skills/`。新开对话后生效，在消息框里输入 `/academic-mode` 手动调用。

全局安装放在 `~/.gemini/config/skills/`。已在 Antigravity 44.5.1 上实测：它的语言服务器能识别 `<项目>/.agents/skills/` 和 `~/.gemini/config/skills/` 里的技能，不读 `~/.gemini/antigravity/skills/`、`~/.gemini/skills/` 和 `~/.agents/skills/`。`skills` 工具的文档把 Antigravity 的全局目录写成 `~/.gemini/antigravity/skills/`，所以给 Antigravity 装技能时用项目级安装。实测只覆盖技能加载器；模型在对话里是否选用它，取决于任务和技能描述。

### 一条命令装进多个工具

[`skills`](https://github.com/vercel-labs/skills) 是社区的技能安装工具（需要 Node.js 22.20 或更高版本），会检测你装了哪些工具并让你勾选：

```
npx skills add FelixJiashengFu/dsh-academic-switch --skill academic-mode
```

默认装进当前项目，加 `-g` 装成全局。它是第三方工具，会收集匿名使用数据，设置环境变量 `DISABLE_TELEMETRY=1` 可以关闭。给 Antigravity 装技能时不要加 `-g`，原因见上。

### 手动安装

把 `plugins/academic-mode/skills/academic-mode` 整个文件夹复制到：

| 工具 | 用户级目录 | 项目级目录 |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/` | `<项目>/.claude/skills/` |
| Codex | `~/.agents/skills/` | `<项目>/.agents/skills/` |
| Antigravity | `~/.gemini/config/skills/` | `<项目>/.agents/skills/` |

## 它做了什么

| 组成 | 实现 | 效果 |
| --- | --- | --- |
| 学术身份 | `systemPrompt.section`，`order: 100`，紧跟部署人格前缀 | 模型从系统提示开头就以学术研究者的标准要求自己 |
| 学术纪律 | `systemPrompt.section`，`order: 650`，`interpolate: false` | 研究计划、三遍资料核查、三遍逻辑检查、多方面取证、交付标准、交付前 10 项自检 |
| 交付前核查闸门 | `agent/turn-stopping` 中调用 `agent.steer(...)` | 缺少核查记录的长回复在本轮结束前退回补查一次 |
| 推理强度 | `agent/request` 瀑布里读取 `llm.resolveModelInfo()`，把 `reasoningEffort` 换成该路由声明的最强一档 | 思考更久，更少跳步 |
| 输出预算 | 同一处把 `maxTokens` 抬到模型的 `defaultMaxTokens`；已配置更大的值时保留原值 | 不因默认输出上限被截断 |
| 视觉 | 关闭时中性描边；开启时深蓝渐变，界面主色转为学术蓝 | 一眼看出当前处于学术模式 |

## 学术纪律

全文在 [`lib/prompt.js`](lib/prompt.js)，学术身份约 140 字，纪律约 4,300 字，分八章：

1. **开工前：研究计划**：写清问题、范围、隐含前提与验收标准；比较 2–3 条研究路径后选定一条；能自己查清的事实先查，不把可以检索的问题抛给用户。
2. **底线**：无来源不陈述；绝不编造文献、DOI、数据或核查过程；分清事实、推断、观点与推测；置信度高、中、低各有判定标准；不用「应该」「据说」「一般认为」代替核查；前提有误先指出。
3. **多方面查找资料**：中英文检索词；关键问题至少覆盖五类来源中的三类；正反都查，找不到反证时写明检索范围与检索词；追到原始出处，只读到转述时标注「转引自」；依据全文；关注时效与正式发表版；关键结论至少两个独立来源；子代理按固定格式交回并附原文摘录。
4. **资料真实性三遍核查**，每个被引用的来源都要过：
   - 第一遍 · 存在性与元数据：DOI、arXiv 编号、PMID、ISBN 或官方网址能打开，题名、作者、年份、卷期页码与版本逐项核对；
   - 第二遍 · 内容一致性：回到原文定位页码、图表或条款；直接引语逐字一致；转述不改变原文的确定程度；引用必须支撑它所在的那句话；
   - 第三遍 · 独立交叉与可信度：独立来源交叉验证，查撤稿与更正，评估证据等级与利益冲突。
5. **逻辑严谨性三遍检查**，交付前完成：
   - 第一遍 · 结构：论点 → 证据 → 结论链条完整，量词、人群、时间与地域精确；
   - 第二遍 · 推理与计算：排查常见谬误与偏倚，因果结论需要相应研究设计，数值与统计量重新计算并附不确定性；
   - 第三遍 · 对抗审查：以审稿人身份写出最可能被攻击的三点并回应，摘要与正文的数字一致。
6. **交付标准**：结论摘要 → 论证与证据 → 局限（含后续验证步骤）→ 参考文献 → 核查记录。参考文献未指定格式时，中文默认 GB/T 7714—2025（现行版，2026-07-01 起实施），英文默认 APA 第 7 版。核查记录的每一项都要对应本次真实打开过的页面、文件或运行过的命令。
7. **交付前自检**：10 项清单，结果写在核查记录最后一行。
8. **诚实与边界**：没做成的核查如实写明影响；同一动作失败两次就换思路；破坏性或对外操作仍需确认。

三遍用的是三种不同的方法，而不是把同一个检查重复三次：三种方法各自能发现另外两种发现不了的错误。资料核查分别针对不存在的文献、引错的数字与已撤稿的研究；逻辑检查分别针对断裂的论证链、算错的统计量与经不起反驳的结论。

## 交付前核查闸门

模型「声称」做完三遍检查并不等于真的做了，所以开关额外在交付环节设了一道检查：

1. 插件跟踪每个会话本轮的助手消息。
2. 本轮即将结束时（`agent/turn-stopping`），如果开关开着、最后一条回复不少于 600 个字符，且本轮没有任何一条消息含有标题为「核查记录」（或 Verification log）的一节，插件会用 `agent.steer(...)` 发回一条标注为「学术模式 · 交付前核查」的提示，要求补完三遍核查并附上核查记录。
3. 每个会话每一轮最多退回一次，所以不会形成循环；已取消的回合不处理；不含事实陈述的回复可以只答一句「本条无需核查记录」。

这条提示按 DSH 的消息来源约定带有插件自己的来源标签（`kind: 'academic-switch'`，`form: 'notice'`），不会被当成你输入的内容。

## 设计说明

1. **段落位置**。`@deepseek-ai/dsh-system-prompt` 按 `order` 升序排列段落，并为自带段落保留了这些位置：身份 −1000、部署人格前缀 0、计划模式政策 500、团队政策 600、工具说明从 1000 起。学术身份放在 100，读起来是身份的一部分；学术纪律放在 650，排在两段政策之后（计划模式仍然决定什么可以执行），排在所有工具说明之前。两段作为一个整体注册，任一段失败时另一段一起撤回。
2. **不换模型**。只在当前选中的模型上把预算拉满，不改 provider 和 model，不破坏会话的模型粘性。
3. **只请求模型真有的档位**。`reasoningEffort` 取自适配器声明的候选，不会塞入会被拒绝的值；模型没有推理档位时只调整 `maxTokens`。
4. **全局生效**。开关打开时，所有会话和子代理都会带上纪律、拉满预算并经过闸门；同时跑多个会话时注意用量。不需要时关掉即可。
5. **状态路由只接受本机同源请求**。`/plugins/dsh-academic-switch/state` 只接受回环地址；POST 必须是 `application/json`，所以其他网站无法用表单提交悄悄打开开关；带有不同源 `Origin` 的请求会被拒绝。
6. **失败不致命**。提示词服务晚于插件就绪或中途重载时，段落会自动重新挂载；查询模型能力失败时，这一步按原配置发送，错误显示在开关的悬浮提示里。

与 [豪霸模式](https://github.com/FelixJiashengFu/dsh-haoba-mode) 的关系：学术模式已经包含「推理强度与输出预算拉满」，两者不需要同时打开；同时打开也不冲突，各自的提示词段落分别生效。

## 状态与接口

开关状态保存在 `~/.dsh/academic-switch.json`（`{ "enabled": true, "title": "学术模式" }`），重启后自动恢复。

回环 HTTP 路由 `GET|POST /plugins/dsh-academic-switch/state`：

```json
{ "ok": true, "enabled": true, "lastError": null,
  "applied": { "provider": "…", "model": "…", "reasoningEffort": "max", "maxTokens": 65536, "at": 0 },
  "gate": { "count": 0, "lastAt": null } }
```

POST 请求体为 `{ "enabled": true }` 或 `{ "enabled": false }`。`applied` 是最近一次真正改过的调用参数，`gate` 是交付前核查闸门的触发次数与最近一次时间，开关的悬浮提示会显示它们。

## 结构

```
package.json             dsh.bundle.patch + dsh.client（把 lib/client.js 送进 Web 客户端）
cordis.patch.yml         Host 半边的挂载行
lib/protocol.js          路由、段落名与位置、闸门参数（浏览器半边复制路由常量）
lib/prompt.js            学术身份、学术纪律与闸门提示的全文（唯一来源）
lib/index.js             Host：状态持久化、回环路由、agent/request、systemPrompt 段落、交付前核查闸门
lib/client.js            浏览器：深蓝开关（只依赖 react，无 JSX、无 import）
locale/zh.json           插件市场里的中文名与简介
locale/en.json           英文名与简介
icon.svg                 学位帽图标
plugins/academic-mode/   Claude Code 与 Codex 的插件：两份清单、skills/academic-mode/SKILL.md、LICENSE
.claude-plugin/          Claude Code 的市场清单
.agents/plugins/         Codex 的市场清单
skills.sh.json           告诉 skills 工具到哪里找技能
scripts/                 由 lib/prompt.js 生成技能文件（npm run sync-skill）
test/                    node:test 测试
CHANGELOG.md             更新日志
.github/workflows/       GitHub Actions：在 Node 22、24、26 上运行测试
```

## 测试

需要 Node.js 22 或更高版本，无需安装依赖：

```
npm test
```

共 26 个测试。其中 18 个用一个假的 Cordis 上下文运行插件的真实代码，覆盖：开关与状态持久化；两段提示词只注册一次、失败时整体撤回、提示词服务晚到或重载时重新挂载；推理强度与输出预算的选择规则；交付前核查闸门的触发条件、每轮一次的上限与提示消息的格式；重启恢复；路由的来源与请求体校验；浏览器半边的注册位置与初始渲染；提示词的章节顺序、十项自检与核查记录标题识别。另外 8 个检查 Claude Code、Codex 与 Antigravity 的打包：两份插件清单与 npm 包的名称、版本、许可一致；两个市场清单和 `skills.sh.json` 指向存在的目录；技能文件的前置信息合法，正文与 `lib/prompt.js` 逐字一致，并且不含只在 DSH 里成立的说法。

## 代价

开启后每一步请求都会多带约 4,500 个字符的提示词，推理也会更长；核查记录会让回复变长；闸门每轮最多多出一步。这是这个模式的设计目的：用 token 和时间换可核查、可复现的结果。不需要时把开关关掉即可，状态立即生效，无需重启。

## English

Academic Mode switch for DeepSeek Harness. While it is on, every session gets an academic identity and a strict discipline in its system prompt (research plan, three-pass source verification, three-pass logic review, multi-source research, a ten-item pre-delivery checklist and a verification log), each model step runs at its strongest advertised reasoning effort and full output budget, and a long final reply without a verification log is sent back once before the turn closes. The prompt text is in Chinese and the model answers in the user's language. Install it from this repository's URL in the plugin page; run the tests with `npm test` on Node.js 22 or later. The repository is also a plugin marketplace for Claude Code and Codex and a skill source for Antigravity (`npx skills add FelixJiashengFu/dsh-academic-switch`). Those tools get the discipline as a skill, without the switch, the delivery gate or the reasoning-effort settings.

## 许可

[MIT](LICENSE)
