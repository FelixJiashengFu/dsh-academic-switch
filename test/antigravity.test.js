// The Antigravity custom agent: the file carries the frontmatter Antigravity
// documents, the same text the Harness plugin injects, and nothing it cannot vouch for.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ACADEMIC_IDENTITY, ACADEMIC_PROMPT } from '../lib/prompt.js'
import { renderAgent } from '../scripts/agent.mjs'

/** Read the checked-in agent with LF line endings, whatever the checkout used. */
const file = (await readFile(new URL('../antigravity/agents/academic-mode.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n')
const parts = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(file)

test('the agent opens with frontmatter, a blank line and a body', () => {
	assert.ok(parts, 'frontmatter, blank line, body')
})

test('the frontmatter names the agent, describes it, and makes it a main agent but not a subagent', () => {
	const lines = parts[1].split('\n')
	assert.deepEqual(lines.map((line) => line.split(':')[0]), ['name', 'description', 'mainAgent', 'subagent'])
	assert.equal(lines[0], 'name: academic-mode')
	assert.match(lines[1], /^description: "[^"\\]{20,400}"$/, 'one quoted line, no inner quotes')
	assert.equal(lines[2], 'mainAgent: true', 'selectable in the Main Agent picker')
	assert.equal(lines[3], 'subagent: false', 'the planner must not delegate unrelated work to a mode')
})

test('tools, model and command policy stay unset so Antigravity defaults and the user settings apply', () => {
	// Antigravity documents that a misspelled or unmapped tool name can hang the
	// agent; only the names it publishes are safe, and that list is incomplete.
	for (const key of ['tools', 'model', 'commandExecutionPolicy', 'mcpServers', 'skills', 'plugins']) {
		assert.equal(new RegExp(`^${key}:`, 'm').test(parts[1]), false, `${key} must stay unset`)
	}
})

test('the body is exactly the identity and discipline the Harness plugin injects', () => {
	assert.equal(parts[2], `${ACADEMIC_IDENTITY}\n\n${ACADEMIC_PROMPT}\n`)
})

test('the checked-in agent is what npm run sync-agent writes', () => {
	assert.equal(file, renderAgent())
})
