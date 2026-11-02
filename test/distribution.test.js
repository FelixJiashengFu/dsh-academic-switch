// Packaging for Claude Code and Codex: the manifests agree with each other and
// with the npm package, and the Agent Skill carries exactly the text the
// DeepSeek Harness plugin injects.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { ACADEMIC_IDENTITY, ACADEMIC_PROMPT } from '../lib/prompt.js'
import { CORE_END, CORE_START, renderSkill } from '../scripts/skill.mjs'

const root = new URL('../', import.meta.url)
const PLUGIN_DIR = 'plugins/academic-mode'

/** Read a repository file with LF line endings, whatever the checkout used. */
async function read(path) {
	return (await readFile(new URL(path, root), 'utf8')).replace(/\r\n/g, '\n')
}

/** Read and parse a JSON file of the repository. */
async function readJson(path) {
	return JSON.parse(await read(path))
}

const pkg = await readJson('package.json')
const claudePlugin = await readJson(`${PLUGIN_DIR}/.claude-plugin/plugin.json`)
const portablePlugin = await readJson(`${PLUGIN_DIR}/plugin.json`)
const claudeMarketplace = await readJson('.claude-plugin/marketplace.json')
const codexMarketplace = await readJson('.agents/plugins/marketplace.json')
const skill = await read(`${PLUGIN_DIR}/skills/academic-mode/SKILL.md`)

test('both plugin manifests share one identity and the version of the npm package', () => {
	const repository = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')
	assert.equal(claudePlugin.name, 'academic-mode')
	assert.equal(portablePlugin.name, claudePlugin.name)
	for (const manifest of [claudePlugin, portablePlugin]) {
		assert.equal(manifest.version, pkg.version)
		assert.equal(manifest.license, pkg.license)
		assert.equal(manifest.repository, repository)
		assert.equal(manifest.homepage, `${repository}#readme`)
		assert.equal(manifest.author.name, pkg.author)
		assert.ok(manifest.description.length > 0)
	}
	assert.equal(portablePlugin.description, claudePlugin.description)
	assert.deepEqual(portablePlugin.keywords, claudePlugin.keywords)
})

test('both marketplaces list the plugin under the same name and point at a folder that holds it', async () => {
	assert.equal(claudeMarketplace.name, codexMarketplace.name, 'one marketplace name in both tools')
	assert.ok(claudeMarketplace.owner?.name)

	assert.equal(claudeMarketplace.plugins.length, 1)
	const [claudeEntry] = claudeMarketplace.plugins
	assert.equal(claudeEntry.name, claudePlugin.name, 'entry name equals manifest name')
	assert.equal(claudeEntry.source, `./${PLUGIN_DIR}`)
	assert.equal(claudeEntry.version, undefined, 'the version lives in plugin.json only')

	assert.equal(codexMarketplace.plugins.length, 1)
	const [codexEntry] = codexMarketplace.plugins
	assert.equal(codexEntry.name, portablePlugin.name)
	assert.deepEqual(codexEntry.source, { source: 'local', path: `./${PLUGIN_DIR}` })
	assert.deepEqual(codexEntry.policy, { installation: 'AVAILABLE', authentication: 'ON_INSTALL' })
	assert.equal(typeof codexEntry.category, 'string')

	for (const file of ['.claude-plugin/plugin.json', 'plugin.json', 'skills/academic-mode/SKILL.md']) {
		await access(new URL(`${PLUGIN_DIR}/${file}`, root))
	}
})

test('SKILL.md opens with frontmatter whose name matches its folder and whose description is a plain quoted string', () => {
	const match = /^---\nname: ([a-z0-9-]+)\ndescription: "([^"\\\n]+)"\n---\n/.exec(skill)
	assert.ok(match, 'frontmatter holds exactly a name and a one-line quoted description')
	assert.equal(match[1], 'academic-mode')
	assert.equal(match[1], claudePlugin.name)
	assert.ok(match[2].length >= 100 && match[2].length <= 1000, `description is ${match[2].length} characters`)
	assert.ok(match[2].includes('学术模式') && /academic mode/i.test(match[2]))
})

test('SKILL.md carries exactly the identity and discipline the Harness plugin injects', () => {
	const core = skill.split(`${CORE_START}\n`)[1].split(`\n${CORE_END}`)[0]
	assert.equal(core, `${ACADEMIC_IDENTITY}\n\n${ACADEMIC_PROMPT}`)
})

test('the checked-in SKILL.md is what npm run sync-skill writes', () => {
	assert.equal(skill, renderSkill())
})

test('the shared text states nothing that holds only inside the Harness', () => {
	// The Harness plugin raises reasoning effort and output budget; a skill in
	// Claude Code or Codex cannot, so the text must not say it was done.
	for (const text of [ACADEMIC_IDENTITY, ACADEMIC_PROMPT]) {
		assert.equal(text.includes('已拉到上限'), false)
	}
})

test('skills.sh.json points the skills CLI at the folder that holds the skill', async () => {
	const config = await readJson('skills.sh.json')
	assert.deepEqual(config.paths, [`./${PLUGIN_DIR}/skills`])
	await access(new URL(`${PLUGIN_DIR}/skills/academic-mode/SKILL.md`, root))
})

test('the plugin folder ships its own copy of the licence', async () => {
	assert.equal(await read(`${PLUGIN_DIR}/LICENSE`), await read('LICENSE'))
})
