<p align="center">
  <img src="assets/banner.svg" alt="学术模式 Academic Mode：来源核查三遍，逻辑检查三遍，交付附核查记录" width="720">
</p>

<p align="center">
  <a href="https://github.com/FelixJiashengFu/dsh-academic-switch/actions/workflows/test.yml"><img src="https://github.com/FelixJiashengFu/dsh-academic-switch/actions/workflows/test.yml/badge.svg" alt="test"></a>
  <a href="https://github.com/FelixJiashengFu/dsh-academic-switch/releases/latest"><img src="https://img.shields.io/github/v/release/FelixJiashengFu/dsh-academic-switch" alt="release"></a>
  <a href="https://www.npmjs.com/package/dsh-academic-switch"><img src="https://img.shields.io/npm/v/dsh-academic-switch" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/FelixJiashengFu/dsh-academic-switch" alt="license"></a>
</p>

<p align="center"><b>中文</b> · <a href="README.en.md">English</a></p>

# 学术模式 · Academic Mode

**让 AI 助手像审稿人一样工作。** 它给 AI 一套必须遵守的查证纪律：每个引用的来源核查三遍，每份交付检查三遍逻辑，最后附上一份写明“查了什么、怎么查的”的核查记录。

适用于 **Claude Code · Codex · Antigravity · DeepSeek Harness**。

## 为什么需要

AI 写论文、做文献综述，最危险的不是写得差，而是写得像真的：

- 引用的文献不存在，或者 DOI、卷期页码对不上；
- 引文是真的，但结论被悄悄改得更确定：“可能相关”变成了“证明导致”；
- 数字没算过，百分比和百分点混在一起；
- 全程没有任何迹象告诉你哪一步其实没查。

学术模式不让模型变得更聪明。它做的是把查证变成**强制步骤**，并且让没做的部分在交付里**看得见**。

## 它让 AI 怎么做

| 环节 | 做什么 | 能抓到什么 |
| --- | --- | --- |
| **来源三遍核查** | 第一遍确认来源真实存在、元数据对得上；第二遍回到原文，核对数字和引语；第三遍找独立来源交叉验证，查撤稿 | 不存在的文献、引错的数字、已撤稿的研究 |
| **逻辑三遍检查** | 第一遍查论证结构；第二遍排查谬误并重新计算数字；第三遍以审稿人身份反驳自己 | 断裂的论证链、算错的统计量、经不起反驳的结论 |
| **多方面查资料** | 中英文检索词；至少三类来源；正反证据都查；追到原始出处 | 只看到一边、只引了二手转述 |
| **交付前自检** | 十项清单，结果写进核查记录 | 悄悄跳过的步骤 |
| **核查记录** | 交付时附上来源核查表，每一项都对应本次真实打开过的页面或运行过的命令 | 无法追溯的结论 |

三遍用的是三种不同的方法，不是把同一个检查重复三次：每种方法能发现另外两种发现不了的错误。完整规则见 [`lib/prompt.js`](lib/prompt.js)，分八章。

## 交付物长什么样

下面是一份**核查记录的格式示例**。内容来自本项目开发时对这个问题的一次真实查证，由人工整理，不是模型输出。

> **问题**：GB/T 7714 参考文献著录规则，现在用哪一版？
>
> **结论**（置信度：中）：现行版是 GB/T 7714—2025，2025-12-02 发布，2026-07-01 起实施，取代 2015 版。
>
> ### 核查记录
>
> | 来源 | 第一遍 | 第二遍 | 第三遍 | 结论 |
> | --- | --- | --- | --- | --- |
> | ① 全国标准信息公共服务平台 | 条目存在，状态“现行” | 两个日期与结论一致 | 官方一手来源 | 采用 |
> | ② readwonders.com 的指南 | 页面存在，属二手整理 | 日期与①一致 | 自称依据①，不独立 | 仅作旁证 |
>
> **来源说明**：① std.samr.gov.cn 的标准查询结果，2026-11-01 打开：GB/T 7714-2025《信息与文献 参考文献著录规则》，推荐性，发布日期 2025-12-02，实施日期 2026-07-01，状态“现行”；GB/T 7714-2015 状态为“废止”。② 页面末尾的来源列表把①列为依据。
>
> **检索词**：GB/T 7714 2025；参考文献著录规则 现行；实施日期。
>
> **局限**：只有一个独立的一手来源（官方平台），所以置信度是“中”而不是“高”；没有读到标准正文。
>
> **自检**：10/10 通过（第 3 项以“单一来源”标注）。

注意最后两条：它没有假装查得很全，而是写明只有一个独立来源、没读正文，并据此降低了置信度。这正是这套纪律想要的行为。

## 30 秒安装

| 你用的工具 | 安装 |
| --- | --- |
| **Claude Code** | `/plugin marketplace add FelixJiashengFu/dsh-academic-switch`<br>`/plugin install academic-mode@felixfu-plugins` |
| **Codex** | `codex plugin marketplace add FelixJiashengFu/dsh-academic-switch`<br>`codex plugin add academic-mode@felixfu-plugins` |
| **Antigravity** | 复制一个智能体文件，见[下面](#antigravity)，装好后在“Main Agent”里选它 |
| **DeepSeek Harness** | 插件页填 `dsh-academic-switch` 或本仓库地址，安装后点“立即启用” |
| **其他支持 SKILL.md 的工具** | `npx skills add FelixJiashengFu/dsh-academic-switch --skill academic-mode` |

装好后试试这样问：

- `用学术模式帮我核对这条参考文献是否真实存在：……`
- `用学术模式梳理 X 领域最近两年的进展，并附核查记录`
- `用学术模式检查这段论证有没有逻辑漏洞`

<details>
<summary><b>Claude Code 的更多说明</b></summary>

在终端里用 `claude plugin marketplace add …` 和 `claude plugin install …` 同样可行。Claude Code 2.1.275 或更高版本也可以一步完成：

```
/plugin install academic-mode --marketplace FelixJiashengFu/dsh-academic-switch
```

装好后重启会话或运行 `/reload-plugins`。手动调用用 `/academic-mode:academic-mode`，也可以直接说“用学术模式……”。

</details>

<details>
<summary><b>Codex 的更多说明</b></summary>

新开会话后生效。输入 `$` 或运行 `/skills` 可以手动选用。只想要技能、不想装插件，把 `plugins/academic-mode/skills/academic-mode` 整个文件夹复制到 `~/.agents/skills/`。

</details>

<h3 id="antigravity">Antigravity</h3>

Antigravity 有两种装法。**自定义智能体**更接近“模式”：选中它，整场对话都按学术纪律走，不靠模型自己判断要不要载入。它出现在输入框下方的“Main Agent”下拉里，也出现在“Customizations”页的 Custom Agents 一栏。

智能体就是一个 Markdown 文件，仓库里是 [`antigravity/agents/academic-mode.md`](antigravity/agents/academic-mode.md)。`skills` 工具只装技能、不装智能体，所以需要复制文件。

PowerShell，装成全局（所有项目可用）：

```
New-Item -ItemType Directory -Force "$HOME\.gemini\config\agents" | Out-Null
Invoke-WebRequest https://raw.githubusercontent.com/FelixJiashengFu/dsh-academic-switch/main/antigravity/agents/academic-mode.md -OutFile "$HOME\.gemini\config\agents\academic-mode.md"
```

macOS / Linux：

```
mkdir -p ~/.gemini/config/agents
curl -fsSL https://raw.githubusercontent.com/FelixJiashengFu/dsh-academic-switch/main/antigravity/agents/academic-mode.md -o ~/.gemini/config/agents/academic-mode.md
```

只给单个项目用，就放到 `<项目>/.agents/agents/academic-mode.md`。装好后重新打开 Antigravity。

<details>
<summary><b>不想用智能体，想要技能</b></summary>

技能只在任务匹配描述、或你输入 `/academic-mode` 时载入。在项目目录里运行：

```
npx skills add FelixJiashengFu/dsh-academic-switch --skill academic-mode -a antigravity
```

给 Antigravity 装技能时不要加 `-g`：`skills` 工具把 Antigravity 的全局目录写成 `~/.gemini/antigravity/skills/`，而 Antigravity 44.5.1 实际读的是 `~/.gemini/config/skills/`，不读前者。

智能体和技能不要同时装：两份是同一套学术纪律，同时存在会重复载入。

</details>

## 各工具得到什么

| | Claude Code | Codex | Antigravity | DeepSeek Harness |
| --- | :---: | :---: | :---: | :---: |
| 学术纪律（全文相同） | ✅ 技能 | ✅ 技能 | ✅ 智能体或技能 | ✅ 系统提示 |
| 整场对话常开 | 靠技能触发 | 靠技能触发 | ✅ 选中智能体 | ✅ 输入框开关 |
| 交付前核查闸门 | — | — | — | ✅ |
| 推理强度与输出预算拉满 | 在工具设置里调 | 在工具设置里调 | 在工具设置里调 | ✅ |

后三行的“—”不是遗漏：闸门和推理强度依赖 DeepSeek Harness 的插件接口，其他工具没有对应的挂载点，技能也改不了模型参数。

## 常见问题

**它能保证 AI 不编造文献吗？**
不能，也没有任何提示词能保证。它做的是三件事：把查证写成强制步骤；要求每个结论标明来源和置信度；要求没查到的部分写成“未核实”。结果是造假更难，漏查更容易被你发现。引用仍然要你自己抽查。

**交付前核查闸门会判断核查记录是否属实吗？**
不会。它只检查长回复里有没有“核查记录”这一节，没有就退回补一次。内容真不真，要靠你读核查记录里的来源去验证。

**效果有评测吗？**
还没有系统评测。已经验证的是安装和加载：Claude Code 2.1.312 和 Codex 0.165.0 用本页的命令实际装上了；Antigravity 44.5.1 的技能与智能体加载器识别并正确解析了文件。模型在对话里按这套纪律做到什么程度，取决于你用的模型，这部分没有测。欢迎在 Issues 里贴出它没做到的地方。

**会让回复变长、变慢、更费 token 吗？**
会。每次请求多带约 4,500 个字符的提示词，推理更久，回复多一份核查记录。这是用时间和用量换可核查性。简单问答不需要用它。

**它安全吗？**
技能和智能体都只是 Markdown 文本，不运行任何代码，也不申请额外权限。DeepSeek Harness 版是真正运行的插件，状态接口只接受本机回环地址的同源请求，源码都在 `lib/` 里，不长。

**规则是中文的，英文问题能用吗？**
规则里写明了“用用户提问的语言交付”。规则本身目前只有中文版，欢迎提交英文翻译。

## 想深入

- [开发者文档](docs/development.md)：实现、设计取舍、状态接口、目录结构、测试
- [更新日志](CHANGELOG.md)
- 姐妹项目 [豪霸模式](https://github.com/FelixJiashengFu/dsh-haoba-mode)：只拉满推理强度与输出预算，不带学术纪律

## 许可

[MIT](LICENSE) © Jiasheng Fu
