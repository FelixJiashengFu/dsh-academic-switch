/**
 * Renders the Antigravity custom agent from the same text the DeepSeek Harness
 * plugin injects, so the two can never say different things.
 *
 * `npm run sync-agent` writes the file; test/antigravity.test.js fails when the
 * checked-in copy differs from what this module renders.
 *
 * @module dsh-academic-switch/scripts/agent
 */

import { ACADEMIC_IDENTITY, ACADEMIC_PROMPT } from '../lib/prompt.js'

/** Where the rendered agent is checked in. */
export const AGENT_FILE = new URL('../antigravity/agents/academic-mode.md', import.meta.url)

/**
 * Frontmatter, as documented at https://antigravity.google/docs/subagents.
 *
 * `mainAgent: true` makes the agent selectable as the chat's main agent, which
 * is what turns it into a mode. `subagent: false` keeps the planner from
 * delegating unrelated work to it.
 *
 * Left out on purpose, so Antigravity's documented defaults apply:
 *  - `tools`: the documentation warns that a misspelled or unmapped tool name
 *    can hang the agent, and the complete list of valid names is not published;
 *  - `model` (inherit) and `commandExecutionPolicy` (sandbox): they carry the
 *    user's own choices and safety settings.
 *
 * The description is a double-quoted YAML string with no inner double quotes
 * and no backslashes, so every parser reads it the same way.
 */
const FRONTMATTER = `---
name: academic-mode
description: "学术模式（Academic Mode）：每个来源三遍真实性核查、每份交付三遍逻辑检查、多方面查找资料、交付前十项自检，并附核查记录。"
mainAgent: true
subagent: false
---`

/** @returns {string} the complete agent file, with LF line endings. */
export function renderAgent() {
	return `${FRONTMATTER}\n\n${ACADEMIC_IDENTITY}\n\n${ACADEMIC_PROMPT}\n`
}
