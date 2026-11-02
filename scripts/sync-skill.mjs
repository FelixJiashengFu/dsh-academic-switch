// Writes the cross-tool Agent Skill from lib/prompt.js.
// Run it after changing the prompt text: npm run sync-skill
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILL_FILE, renderSkill } from './skill.mjs'

const target = fileURLToPath(SKILL_FILE)
await mkdir(dirname(target), { recursive: true })
await writeFile(target, renderSkill(), 'utf8')
console.log('wrote ' + target)
