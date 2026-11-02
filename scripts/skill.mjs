/**
 * Renders the cross-tool Agent Skill (Claude Code, Codex and any other host that
 * reads SKILL.md) from the same text the DeepSeek Harness plugin injects, so the
 * two can never say different things.
 *
 * `npm run sync-skill` writes the file; test/distribution.test.js fails when the
 * checked-in copy differs from what this module renders.
 *
 * @module dsh-academic-switch/scripts/skill
 */

import { ACADEMIC_IDENTITY, ACADEMIC_PROMPT } from '../lib/prompt.js'

/** Where the rendered skill is checked in. */
export const SKILL_FILE = new URL('../plugins/academic-mode/skills/academic-mode/SKILL.md', import.meta.url)

/** Markers around the text shared with the DeepSeek Harness plugin. */
export const CORE_START = '<!-- academic-core:start -->'
export const CORE_END = '<!-- academic-core:end -->'

/**
 * Frontmatter. `name` must equal the folder name. The description is a
 * double-quoted YAML string with no inner double quotes and no backslashes, so
 * every parser reads it the same way.
 */
const FRONTMATTER = `---
name: academic-mode
description: "学术模式（Academic Mode）：做文献综述、论文写作、引用与事实核查，或任何需要可发表级严谨度的研究任务时使用。要求每个来源三遍真实性核查、每份交付三遍逻辑检查、多方面查找资料，并附核查记录。用户说「学术模式」或 academic mode 时直接使用；闲聊和不涉及事实与论证的简单任务不要使用。Use for literature reviews, paper writing, citation and fact checking, and research that must be publication-grade."
---`

/** Host-neutral notes on how to carry the discipline out. */
const TAIL = `## 在 Claude Code、Codex 等环境中执行

- **检索与抓取**：使用当前环境提供的联网搜索与网页读取工具。DOI 用 https://doi.org/<DOI> 解析；Crossref 登记的 DOI 可用 https://api.crossref.org/works/<DOI> 查元数据。
- **并行取证**：环境支持子代理时，相互独立的子问题并行检索，并按学术纪律第三章第 8 条规定交回格式；交回的结论亲自复核后再采用。
- **复算**：数值、统计与公式用代码（例如 Python）复算，把命令与结果摘要写进核查记录。
- **无法联网时**：按学术纪律第三章第 9 条处理，开头声明「本次无法联网核实」。`

/** @returns {string} the complete SKILL.md, with LF line endings. */
export function renderSkill() {
	return `${FRONTMATTER}\n\n${CORE_START}\n${ACADEMIC_IDENTITY}\n\n${ACADEMIC_PROMPT}\n${CORE_END}\n\n${TAIL}\n`
}
