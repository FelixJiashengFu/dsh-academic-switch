// The documentation makes claims a reader will act on. These tests keep the ones
// that can be checked mechanically true: links land on real files, install
// commands name what the manifests name, and the sample verification log has the
// shape the discipline asks for and passes the delivery gate.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ACADEMIC_PROMPT } from '../lib/prompt.js'
import { GATE_MIN_CHARS, VERIFICATION_LOG_PATTERN } from '../lib/protocol.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const DOCS = ['README.md', 'README.en.md', 'docs/development.md']

/** Read a repository file with LF line endings, whatever the checkout used. */
async function read(path) {
	return (await readFile(resolve(root, path), 'utf8')).replace(/\r\n/g, '\n')
}

const texts = Object.fromEntries(await Promise.all(DOCS.map(async (path) => [path, await read(path)])))
const claudeMarketplace = JSON.parse(await read('.claude-plugin/marketplace.json'))
const claudePlugin = JSON.parse(await read('plugins/academic-mode/.claude-plugin/plugin.json'))
const pkg = JSON.parse(await read('package.json'))

/** Every relative link and image target in a markdown or HTML document. */
function localTargets(text) {
	const targets = new Set()
	for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) targets.add(match[1])
	for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g)) targets.add(match[1])
	return [...targets].filter((target) => !/^(https?:|mailto:|#)/.test(target))
}

test('every relative link and image in the documents points at a file that exists', async () => {
	for (const doc of DOCS) {
		const targets = localTargets(texts[doc])
		assert.ok(targets.length > 0, `${doc} links to something local`)
		for (const target of targets) {
			const path = resolve(root, dirname(doc), decodeURIComponent(target.split('#')[0]))
			await access(path).catch(() => assert.fail(`${doc}: broken link ${target}`))
		}
	}
})

test('in-page anchors point at an id that exists in the same document', () => {
	for (const doc of ['README.md', 'README.en.md']) {
		const anchors = [...texts[doc].matchAll(/\]\(#([^)]+)\)/g)].map((match) => match[1])
		assert.ok(anchors.length > 0, `${doc} uses an in-page anchor`)
		for (const anchor of anchors) assert.ok(texts[doc].includes(`id="${anchor}"`), `${doc}: no element with id="${anchor}"`)
	}
})

test('install commands use the marketplace, plugin and repository names the manifests declare', () => {
	const plugin = claudePlugin.name
	const marketplace = claudeMarketplace.name
	const repository = new URL(claudePlugin.repository).pathname.slice(1)
	for (const doc of ['README.md', 'README.en.md']) {
		const text = texts[doc]
		assert.ok(text.includes(`/plugin install ${plugin}@${marketplace}`), `${doc}: Claude Code install`)
		assert.ok(text.includes(`codex plugin add ${plugin}@${marketplace}`), `${doc}: Codex install`)
		assert.ok(text.includes(`/plugin marketplace add ${repository}`), `${doc}: Claude Code marketplace add`)
		assert.ok(text.includes(`codex plugin marketplace add ${repository}`), `${doc}: Codex marketplace add`)
		assert.ok(text.includes(`npx skills add ${repository} --skill ${plugin}`), `${doc}: skills CLI`)
		assert.ok(text.includes(`dsh-academic-switch`) && text.includes(pkg.name), `${doc}: names the npm package`)
		assert.ok(text.includes(`raw.githubusercontent.com/${repository}/main/antigravity/agents/academic-mode.md`), `${doc}: Antigravity download URL`)
	}
})

test('the documents state no test or character counts that would go stale', () => {
	for (const doc of DOCS) {
		assert.equal(/共\s*\d+\s*个测试|\d+\s+tests\b|纪律约\s*[\d,]+\s*字/.test(texts[doc]), false, `${doc} quotes a count`)
	}
})

test('the sample verification log has the columns, passes and ending the discipline asks for', () => {
	const zh = texts['README.md']
	const header = zh.split('\n').find((line) => line.startsWith('> | 来源 |'))
	assert.ok(header, 'sample table header in README.md')
	assert.ok(ACADEMIC_PROMPT.includes('来源 | 第一遍 | 第二遍 | 第三遍 | 结论'), 'the discipline names the same five columns')
	// Strip the blockquote marker first, then split, so the quote mark is not left as a cell.
	const columns = header.replace(/^>\s*/, '').split('|').map((cell) => cell.trim()).filter(Boolean)
	assert.equal(columns.length, 5)
	assert.deepEqual([columns[0], columns[4]], ['来源', '结论'])
	assert.ok(/第一遍/.test(columns[1]) && /第二遍/.test(columns[2]) && /第三遍/.test(columns[3]))
	for (const required of ['**检索词**', '**局限**', '**自检**', '置信度：中', '单一来源']) assert.ok(zh.includes(required), `sample includes ${required}`)
	assert.ok(texts['README.en.md'].includes('single source'), 'English sample marks the single source')
})

test('a reply that carries the sample log passes the delivery gate', () => {
	const zh = texts['README.md']
	const sample = zh.slice(zh.indexOf('> **问题**'), zh.indexOf('注意最后两条')).split('\n').map((line) => line.replace(/^>\s?/, '')).join('\n')
	assert.ok(VERIFICATION_LOG_PATTERN.test(sample), 'the gate recognises the sample log heading')
	assert.ok(sample.length < GATE_MIN_CHARS * 2, 'sample is a compact excerpt')
})
