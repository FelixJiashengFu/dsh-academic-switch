// Writes the Antigravity custom agent from lib/prompt.js.
// Run it after changing the prompt text: npm run sync-agent
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENT_FILE, renderAgent } from './agent.mjs'

const target = fileURLToPath(AGENT_FILE)
await mkdir(dirname(target), { recursive: true })
await writeFile(target, renderAgent(), 'utf8')
console.log('wrote ' + target)
