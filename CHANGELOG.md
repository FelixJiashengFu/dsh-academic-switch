# 更新日志

## 0.3.1 — 2026-11-01

- **新增 Antigravity 自定义智能体** `antigravity/agents/academic-mode.md`：选中后整场对话按学术纪律走，出现在输入框下方的「Main Agent」下拉和「Customizations」页的 Custom Agents 里。文件头设 `mainAgent: true`、`subagent: false`；`tools`、`model`、`commandExecutionPolicy` 故意不写，沿用 Antigravity 默认和你自己的设置。
- 已在 Antigravity 44.5.1 上实测：它的语言服务器（`GetAgentScripts`）识别并正确解析了全局、项目、文件夹三种放置形式，不读 `~/.agents/agents/`。`GetAllCustomAgentConfigs` 在这个版本里已废弃，不能用于验证。
- 新增 `npm run sync-agent` 与 `npm run sync`：由 `lib/prompt.js` 生成智能体文件。新增 5 个测试，共 31 个。
- 智能体放在 `antigravity/agents/`，没有放进 `plugins/academic-mode/agents/`：后者会被 Claude Code 当成子代理自动加载，而这个文件里有它不认识的字段。

## 0.3.0 — 2026-11-01

- **支持 Claude Code、Codex 和 Antigravity**：仓库同时是 Claude Code 与 Codex 的插件市场（`.claude-plugin/marketplace.json`、`.agents/plugins/marketplace.json`），也是 `skills` 安装工具和 Antigravity 的技能源（`skills.sh.json`）。安装后得到 `academic-mode` 技能，学术身份与学术纪律的文字和 DSH 版逐字相同。开关、全局常开、交付前核查闸门、推理强度与输出预算拉满仍是 DSH 独有。
- 学术纪律去掉了「推理强度与输出预算已拉到上限」一句：它只在 DSH 里成立，技能在其他工具里改不了模型参数。
- 新增 `npm run sync-skill`：由 `lib/prompt.js` 生成技能文件。新增 8 个打包测试，检查两份插件清单与 npm 包的名称、版本、许可一致，两个市场清单和 `skills.sh.json` 指向存在的目录，技能文件的前置信息合法且正文与提示词逐字一致。测试增至 26 个。
- 新增 `.gitattributes`，统一使用 LF 换行，避免 Windows 上克隆后技能文件变成 CRLF。

## 0.2.0 — 2026-11-01

- **学术纪律全面加强**（八章，约 4,300 字）：
  - 新增「开工前：研究计划」：写清问题、范围、隐含前提与验收标准，比较 2–3 条研究路径；
  - 置信度高 / 中 / 低各有判定标准；禁止用「应该」「据说」「一般认为」之类的说法代替核查；
  - 找不到反证时必须写明检索范围与检索词；只读到转述时标注「转引自」；预印本要核对是否已有正式发表版；
  - 派子代理时规定交回格式，并要求附支撑结论的原文摘录；
  - 第二遍核查新增：直接引语逐字一致，转述不得改变原文的确定程度，引用必须支撑它所在的那句话；
  - 逻辑检查新增：因果结论的研究设计要求、选择偏倚、混杂、回归均值、百分比与百分点、数值的不确定性；
  - DOI 核对覆盖中文 DOI 与 CNKI 登记的文献；
  - 核查记录标题固定，每一项都必须对应本次真实打开过的页面、文件或运行过的命令；
  - 新增交付前 10 项自检，结果写在核查记录最后一行；
  - 计算要附代码、输入数据版本与随机种子；正式提交时提醒遵守 AI 辅助的披露规定；外文引文附原文与译文。
- **新增学术身份段落**（order 100），紧跟部署人格前缀之后。
- **新增交付前核查闸门**：开关开启时，篇幅较长、却没有「核查记录」的回复，在本轮结束前会被退回补查一次，每轮最多一次。
- 状态接口新增 `gate` 字段，开关的悬浮提示会显示闸门触发次数。
- 两段提示词作为一个整体注册：任一段注册失败时另一段一起撤回。
- 新增 GitHub Actions 测试（Node 22、24、26）；测试增至 18 个。

## 0.1.0 — 2026-11-01

- 首个版本：学术纪律段落、推理强度与输出预算拉满、输入框旁开关、状态持久化与回环状态接口。
