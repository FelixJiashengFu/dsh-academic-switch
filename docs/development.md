# 开发者文档

这份文档写给想读懂实现、贡献代码或自己改规则的人。只想用学术模式，看 [README](../README.md) 就够了。

## DeepSeek Harness 插件做了什么

| 组成 | 实现 | 效果 |
| --- | --- | --- |
| 学术身份 | `systemPrompt.section`，`order: 100`，紧跟部署人格前缀 | 模型从系统提示开头就以学术研究者的标准要求自己 |
| 学术纪律 | `systemPrompt.section`，`order: 650`，`interpolate: false` | 研究计划、三遍资料核查、三遍逻辑检查、多方面取证、交付标准、交付前 10 项自检 |
| 交付前核查闸门 | `agent/turn-stopping` 中调用 `agent.steer(...)` | 缺少核查记录的长回复在本轮结束前退回补查一次 |
| 推理强度 | `agent/request` 瀑布里读取 `llm.resolveModelInfo()`，把 `reasoningEffort` 换成该路由声明的最强一档 | 思考更久，更少跳步 |
| 输出预算 | 同一处把 `maxTokens` 抬到模型的 `defaultMaxTokens`；已配置更大的值时保留原值 | 不因默认输出上限被截断 |
| 视觉 | 关闭时中性描边；开启时深蓝渐变，界面主色转为学术蓝 | 一眼看出当前处于学术模式 |

开关关闭时，插件只在后台待命，一切照旧。开启后从下一条消息起，对所有会话（包括子代理）生效。

## 学术纪律

全文在 [`lib/prompt.js`](../lib/prompt.js)，分八章：

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

同一份文字有三种出口，都由 `lib/prompt.js` 生成，测试保证它们逐字一致：DeepSeek Harness 的系统提示段落、Claude Code 与 Codex 的技能（`plugins/academic-mode/skills/academic-mode/SKILL.md`）、Antigravity 的自定义智能体（`antigravity/agents/academic-mode.md`）。

## 交付前核查闸门

模型「声称」做完三遍检查并不等于真的做了，所以开关额外在交付环节设了一道检查：

1. 插件跟踪每个会话本轮的助手消息。
2. 本轮即将结束时（`agent/turn-stopping`），如果开关开着、最后一条回复不少于 600 个字符，且本轮没有任何一条消息含有标题为「核查记录」（或 Verification log）的一节，插件会用 `agent.steer(...)` 发回一条标注为「学术模式 · 交付前核查」的提示，要求补完三遍核查并附上核查记录。
3. 每个会话每一轮最多退回一次，所以不会形成循环；已取消的回合不处理；不含事实陈述的回复可以只答一句「本条无需核查记录」。

这条提示按 DSH 的消息来源约定带有插件自己的来源标签（`kind: 'academic-switch'`，`form: 'notice'`），不会被当成你输入的内容。

闸门只检查有没有这一节，不判断里面写的是否属实。

## 设计说明

1. **段落位置**。`@deepseek-ai/dsh-system-prompt` 按 `order` 升序排列段落，并为自带段落保留了这些位置：身份 −1000、部署人格前缀 0、计划模式政策 500、团队政策 600、工具说明从 1000 起。学术身份放在 100，读起来是身份的一部分；学术纪律放在 650，排在两段政策之后（计划模式仍然决定什么可以执行），排在所有工具说明之前。两段作为一个整体注册，任一段失败时另一段一起撤回。
2. **不换模型**。只在当前选中的模型上把预算拉满，不改 provider 和 model，不破坏会话的模型粘性。
3. **只请求模型真有的档位**。`reasoningEffort` 取自适配器声明的候选，不会塞入会被拒绝的值；模型没有推理档位时只调整 `maxTokens`。
4. **全局生效**。开关打开时，所有会话和子代理都会带上纪律、拉满预算并经过闸门；同时跑多个会话时注意用量。不需要时关掉即可。
5. **状态路由只接受本机同源请求**。`/plugins/dsh-academic-switch/state` 只接受回环地址；POST 必须是 `application/json`，所以其他网站无法用表单提交悄悄打开开关；带有不同源 `Origin` 的请求会被拒绝。
6. **失败不致命**。提示词服务晚于插件就绪或中途重载时，段落会自动重新挂载；查询模型能力失败时，这一步按原配置发送，错误显示在开关的悬浮提示里。
7. **Antigravity 智能体不写 `tools`、`model`、`commandExecutionPolicy`**。Antigravity 的文档提醒 `tools` 写错名字会让智能体卡死，而模型和命令执行策略应当沿用用户自己的设置。`mainAgent: true` 让它能在「Main Agent」下拉里被选中，`subagent: false` 让规划器不会把无关任务自动派给它。智能体放在 `antigravity/agents/`，没有放进 `plugins/academic-mode/agents/`：后者会被 Claude Code 当成子代理自动加载，而这个文件里有它不认识的字段。

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

## 本地开发

DeepSeek Harness：克隆本仓库后，在 **插件 → 添加插件** 里填本目录的绝对路径，或让 agent 调用插件管理器（不要手改 profile 的 `package.json`）：

```
plugin_manager action=install_bundle target=<本目录绝对路径>
```

卸载：在插件页卸载，或 `plugin_manager action=remove_bundle target=dsh-academic-switch`。

测试需要 Node.js 22 或更高版本，无需安装依赖：

```
npm test
```

改了 `lib/prompt.js` 之后，重新生成技能和智能体文件，再跑测试：

```
npm run sync
npm test
```

测试覆盖：

- **插件行为**：用一个假的 Cordis 上下文运行插件的真实代码。开关与状态持久化；两段提示词只注册一次、失败时整体撤回、提示词服务晚到或重载时重新挂载；推理强度与输出预算的选择规则；交付前核查闸门的触发条件、每轮一次的上限与提示消息的格式；重启恢复；路由的来源与请求体校验；浏览器半边的注册位置与初始渲染。
- **提示词**：章节顺序、十项自检、核查记录标题的识别。
- **打包**：两份插件清单与 npm 包的名称、版本、许可一致；两个市场清单和 `skills.sh.json` 指向存在的目录；技能文件的前置信息合法，正文与 `lib/prompt.js` 逐字一致，并且不含只在 DSH 里成立的说法。
- **Antigravity 智能体**：文件头只有 name、description、mainAgent、subagent 四项，`tools`、`model`、`commandExecutionPolicy` 保持未设置，正文与提示词逐字一致。
- **文档**：所有相对链接都指向存在的文件；安装命令里的市场名、插件名、技能名与清单一致；README 里的核查记录样例符合纪律规定的格式，能通过交付闸门。

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
assets/                  README 封面图（banner.svg）与社交预览图（social-preview.png）
plugins/academic-mode/   Claude Code 与 Codex 的插件：两份清单、skills/academic-mode/SKILL.md、LICENSE
.claude-plugin/          Claude Code 的市场清单
.agents/plugins/         Codex 的市场清单
skills.sh.json           告诉 skills 工具到哪里找技能
antigravity/agents/      Antigravity 自定义智能体（academic-mode.md）
scripts/                 由 lib/prompt.js 生成技能与智能体文件（npm run sync）
docs/                    本文档
README.md, README.en.md  面向使用者的介绍（中文、英文）
test/                    node:test 测试
CHANGELOG.md             更新日志
.github/workflows/       GitHub Actions：在 Node 22、24、26 上运行测试
```

## 代价

开启后每一步请求都会多带一段约 4,500 个字符的提示词，推理也会更长；核查记录会让回复变长；闸门每轮最多多出一步。这是这个模式的设计目的：用 token 和时间换可核查、可复现的结果。不需要时把开关关掉即可，状态立即生效，无需重启。
