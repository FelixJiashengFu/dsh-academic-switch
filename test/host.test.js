// Host-half tests: a fake Cordis context stands in for DeepSeek Harness, so the
// plugin's real code runs unmodified. Run with `npm test` (node --test).
import { after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Point the state file at a throwaway home BEFORE the plugin resolves its path.
const home = await mkdtemp(join(tmpdir(), 'dsh-academic-switch-'))
process.env.USERPROFILE = home
process.env.HOME = home

const plugin = await import('../lib/index.js')
const { ACADEMIC_IDENTITY, ACADEMIC_PROMPT, DELIVERY_GATE_NOTICE } = await import('../lib/prompt.js')
const {
	GATE_MIN_CHARS,
	IDENTITY_SECTION_NAME,
	IDENTITY_SECTION_ORDER,
	MODE_TITLE,
	NOTICE_SOURCE_KIND,
	NOTICE_SUMMARY,
	ROUTE_STATE,
	SECTION_NAME,
	SECTION_ORDER
} = await import('../lib/protocol.js')
const STATE_FILE = join(home, '.dsh', 'academic-switch.json')

const IDENTITY = { name: IDENTITY_SECTION_NAME, order: IDENTITY_SECTION_ORDER, text: ACADEMIC_IDENTITY, interpolate: false }
const DISCIPLINE = { name: SECTION_NAME, order: SECTION_ORDER, text: ACADEMIC_PROMPT, interpolate: false }

beforeEach(async () => { await rm(STATE_FILE, { force: true }) })
after(async () => { await rm(home, { recursive: true, force: true }) })

/** Wrap a cleanup so a second call is a no-op, as Cordis disposers are. */
function once(fn) {
	let done = false
	return () => {
		if (done) return false
		done = true
		if (typeof fn === 'function') fn()
		return true
	}
}

/**
 * A minimal host: plugin context, prompt registry, web server and llm.
 * @param {{ llm?: object, promptAvailable?: boolean, failSection?: string }} [options]
 */
function createHost({ llm, promptAvailable = true, failSection } = {}) {
	const listeners = new Map()
	const sections = []
	const routes = []
	let promptCallback = null
	/** Live registry forks, oldest first. */
	const promptForks = []

	/** One scope whose effects can be disposed together. */
	function scope() {
		const disposers = []
		return {
			disposers,
			effect(execute) {
				const dispose = once(execute())
				disposers.push(dispose)
				return dispose
			},
			disposeAll() {
				for (const dispose of disposers.splice(0).reverse()) dispose()
			}
		}
	}

	function openPromptFork() {
		const fork = scope()
		fork.systemPrompt = {
			section(entry) {
				if (!Number.isFinite(entry.order)) throw new TypeError('order must be finite')
				if (entry.name === failSection) throw new Error(`registry refused ${entry.name}`)
				if (sections.some((s) => s.name === entry.name)) throw new Error(`duplicate section ${entry.name}`)
				sections.push(entry)
				const dispose = once(() => {
					const index = sections.indexOf(entry)
					if (index >= 0) sections.splice(index, 1)
				})
				fork.disposers.push(dispose)
				return dispose
			}
		}
		promptForks.push(fork)
		promptCallback(fork)
	}

	const root = scope()
	const ctx = {
		logger: { info() {}, warn() {}, debug() {} },
		effect: root.effect,
		on(event, fn) { listeners.set(event, fn) },
		get(name) { return name === 'llm' ? llm : undefined },
		inject(names, callback) {
			if (names.includes('systemPrompt')) {
				promptCallback = callback
				if (promptAvailable) openPromptFork()
				return
			}
			if (names.includes('webServer')) {
				const fork = scope()
				fork.webServer = {
					register(route) {
						routes.push(route)
						return () => {
							const index = routes.indexOf(route)
							if (index >= 0) routes.splice(index, 1)
						}
					}
				}
				callback(fork)
			}
		}
	}

	return {
		ctx,
		sections,
		routes,
		listener: (event) => listeners.get(event),
		/** Bring up a new registry fork; an older one stays live until withdrawn. */
		providePrompt: openPromptFork,
		/** Dispose the oldest live registry fork. */
		withdrawPrompt() { promptForks.shift()?.disposeAll() },
		/** Dispose the newest live registry fork. */
		withdrawNewestPrompt() { promptForks.pop()?.disposeAll() }
	}
}

/**
 * Drive the state route like the browser would.
 * @returns {Promise<{ status: number, body: object }>}
 */
function call(host, { method = 'GET', body, headers = {}, remoteAddress = '127.0.0.1' } = {}) {
	const route = host.routes.find((r) => r.path === ROUTE_STATE)
	assert.ok(route, 'state route is registered')
	const raw = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]
	const defaults = method === 'POST' ? { 'content-type': 'application/json' } : {}
	const req = {
		method,
		headers: { host: '127.0.0.1:7777', ...defaults, ...headers },
		socket: { remoteAddress },
		async *[Symbol.asyncIterator]() { for (const chunk of raw) yield chunk }
	}
	return new Promise((resolve, reject) => {
		const res = {
			status: 0,
			writeHead(status) { this.status = status },
			end(payload) { resolve({ status: this.status, body: JSON.parse(payload) }) }
		}
		Promise.resolve(route.handler(req, res)).catch(reject)
	})
}

const STRONG_MODEL = {
	reasoning: {
		efforts: [
			{ id: 'low', name: 'Low' },
			{ id: 'max', name: 'Max' },
			{ id: 'medium', name: 'Medium' },
			{ id: 'high', name: 'High' }
		]
	},
	defaultMaxTokens: 65536
}

/** An llm service whose answer depends on the model id. */
function fakeLlm(byModel) {
	return {
		calls: 0,
		async resolveModelInfo(provider, model) {
			this.calls += 1
			const answer = byModel[model]
			if (answer instanceof Error) throw answer
			return answer
		}
	}
}

/** A fake agent whose steering is recorded. */
function fakeAgent() {
	return {
		session: { id: 'session-1' },
		steered: [],
		steer(message) { this.steered.push(message) }
	}
}

/** Feed one turn's assistant messages through the session event stream. */
function playTurn(host, session, turn, texts) {
	const onEvent = host.listener('session/event')
	onEvent(session, { type: 'turn/start', data: { turn } })
	for (const text of texts) {
		onEvent(session, {
			type: 'assistant/message',
			data: { turn, step: 1, message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'hidden' }, { type: 'text', text }] } }
		})
	}
}

const LONG = '结论'.repeat(GATE_MIN_CHARS)

test('starts off and serves its state on the loopback route', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)
	assert.equal(plugin.name, 'academic-switch')
	assert.deepEqual(plugin.inject, ['webServer'])
	assert.equal(host.routes[0].kind, 'exact')
	const { status, body } = await call(host)
	assert.equal(status, 200)
	assert.equal(body.ok, true)
	assert.equal(body.enabled, false)
	assert.equal(body.lastError, null)
	assert.deepEqual(body.gate, { count: 0, lastAt: null })
	assert.equal(host.sections.length, 0)
})

test('turning on mounts the identity and discipline sections once and persists the state', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)

	const on = await call(host, { method: 'POST', body: { enabled: true } })
	assert.equal(on.status, 200)
	assert.equal(on.body.enabled, true)
	assert.deepEqual(host.sections, [IDENTITY, DISCIPLINE])
	assert.deepEqual(JSON.parse(await readFile(STATE_FILE, 'utf8')), { enabled: true, title: MODE_TITLE })

	const again = await call(host, { method: 'POST', body: { enabled: true } })
	assert.equal(again.status, 200)
	assert.equal(host.sections.length, 2, 'a repeated "on" does not register the sections again')

	const off = await call(host, { method: 'POST', body: { enabled: false } })
	assert.equal(off.body.enabled, false)
	assert.equal(host.sections.length, 0)
	assert.deepEqual(JSON.parse(await readFile(STATE_FILE, 'utf8')), { enabled: false, title: MODE_TITLE })
})

test('never leaves half the mode registered when the registry refuses a section', async () => {
	const host = createHost({ llm: fakeLlm({}), failSection: SECTION_NAME })
	plugin.apply(host.ctx)
	const on = await call(host, { method: 'POST', body: { enabled: true } })
	assert.equal(on.body.enabled, true)
	assert.equal(host.sections.length, 0, 'the identity section was rolled back')
	assert.match(on.body.lastError, /registry refused/)
})

test('raises each model step to the strongest advertised effort and the full output budget', async () => {
	const llm = fakeLlm({
		strong: STRONG_MODEL,
		roomy: STRONG_MODEL,
		odd: { reasoning: { efforts: [{ id: 'fast', name: 'Fast' }, { id: 'deep', name: 'Deep' }] } },
		plain: { defaultMaxTokens: 32000 },
		broken: new Error('adapter offline')
	})
	const host = createHost({ llm })
	plugin.apply(host.ctx)
	const listener = host.listener('agent/request')
	const payload = { turn: 1, step: 1, signal: new AbortController().signal }

	const offBase = Object.freeze({ provider: 'p', model: 'strong', reasoningEffort: 'medium', maxTokens: 8192 })
	assert.equal(await listener(payload, async () => offBase), offBase, 'switch off: request untouched')
	assert.equal(llm.calls, 0, 'switch off: no capability lookup')

	await call(host, { method: 'POST', body: { enabled: true } })

	const base = Object.freeze({ provider: 'p', model: 'strong', reasoningEffort: 'medium', maxTokens: 8192 })
	const shaped = await listener(payload, async () => base)
	assert.notEqual(shaped, base)
	assert.equal(shaped.reasoningEffort, 'max')
	assert.equal(shaped.maxTokens, 65536)
	assert.equal(shaped.provider, 'p')
	assert.equal(base.maxTokens, 8192, 'the frozen proposal is not mutated')

	const state = await call(host)
	assert.equal(state.body.applied.reasoningEffort, 'max')
	assert.equal(state.body.applied.maxTokens, 65536)

	const roomy = await listener(payload, async () => Object.freeze({ provider: 'p', model: 'roomy', maxTokens: 100000 }))
	assert.equal(roomy.maxTokens, 100000, 'a larger configured budget is kept')
	assert.equal(roomy.reasoningEffort, 'max')

	const odd = await listener(payload, async () => Object.freeze({ provider: 'p', model: 'odd' }))
	assert.equal(odd.reasoningEffort, 'deep', 'unranked ids fall back to the last advertised one')
	assert.equal(odd.maxTokens, undefined)

	const plain = await listener(payload, async () => Object.freeze({ provider: 'p', model: 'plain' }))
	assert.equal(plain.reasoningEffort, undefined, 'no effort is invented for a route without reasoning')
	assert.equal(plain.maxTokens, 32000)

	const brokenBase = Object.freeze({ provider: 'p', model: 'broken' })
	assert.equal(await listener(payload, async () => brokenBase), brokenBase, 'a failed lookup leaves the request as it was')
	assert.equal((await call(host)).body.lastError, 'adapter offline')

	const callsBefore = llm.calls
	await listener(payload, async () => base)
	assert.equal(llm.calls, callsBefore, 'capabilities are cached per route')
	assert.equal((await call(host)).body.lastError, null, 'a later success clears the error')
})

test('mounts the sections when the prompt registry arrives late and re-mounts after it returns', async () => {
	const host = createHost({ llm: fakeLlm({}), promptAvailable: false })
	plugin.apply(host.ctx)

	const on = await call(host, { method: 'POST', body: { enabled: true } })
	assert.equal(on.body.enabled, true)
	assert.equal(host.sections.length, 0)
	assert.match(on.body.lastError, /systemPrompt/)

	host.providePrompt()
	assert.deepEqual(host.sections, [IDENTITY, DISCIPLINE])
	assert.equal((await call(host)).body.lastError, null)

	host.withdrawPrompt()
	assert.equal(host.sections.length, 0)
	assert.match((await call(host)).body.lastError, /systemPrompt/, 'a vanished registry is reported, not hidden')

	host.providePrompt()
	assert.equal(host.sections.length, 2, 'the sections come back with the registry')
	assert.equal((await call(host)).body.lastError, null)

	await call(host, { method: 'POST', body: { enabled: false } })
	assert.equal(host.sections.length, 0)
})

test('keeps exactly one copy of the sections when a new registry fork arrives before the old one is disposed', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)
	await call(host, { method: 'POST', body: { enabled: true } })
	assert.equal(host.sections.length, 2)

	host.providePrompt()
	assert.equal(host.sections.length, 2, 'moved to the new fork, not duplicated')
	const [identity, discipline] = host.sections

	host.withdrawPrompt()
	assert.equal(host.sections.length, 2, 'disposing the old fork leaves the new fork\'s sections alone')
	assert.equal(host.sections[0], identity, 'the active registrations are not torn down and re-made')
	assert.equal(host.sections[1], discipline)
	assert.equal((await call(host)).body.lastError, null)

	host.withdrawPrompt()
	assert.equal(host.sections.length, 0)
	const off = await call(host, { method: 'POST', body: { enabled: false } })
	assert.equal(off.body.enabled, false)
	assert.equal(off.body.lastError, null)
})

test('falls back to an older registry fork when the newer one goes first', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)
	await call(host, { method: 'POST', body: { enabled: true } })
	host.providePrompt()
	assert.equal(host.sections.length, 2)

	host.withdrawNewestPrompt()
	assert.equal(host.sections.length, 2, 'remounted on the fork that is still alive')
	assert.equal((await call(host)).body.lastError, null)

	host.withdrawPrompt()
	assert.equal(host.sections.length, 0)
	assert.match((await call(host)).body.lastError, /systemPrompt/)
})

test('delivery gate sends a long reply without a verification log back once per turn', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)
	await call(host, { method: 'POST', body: { enabled: true } })
	const stopping = host.listener('agent/turn-stopping')
	const agent = fakeAgent()
	const signal = new AbortController().signal

	playTurn(host, agent.session, 3, [LONG])
	await stopping({ agent, turn: 3, signal })
	assert.equal(agent.steered.length, 1)

	const [message] = agent.steered
	assert.equal(message.role, 'user')
	assert.match(message.id, /^[0-9a-f-]{36}$/)
	assert.deepEqual(message.source, { kind: NOTICE_SOURCE_KIND, form: 'notice', summary: NOTICE_SUMMARY })
	assert.deepEqual(message.content, [{ type: 'text', text: DELIVERY_GATE_NOTICE }])
	assert.ok(Object.isFrozen(message) && Object.isFrozen(message.content[0]) && Object.isFrozen(message.source), 'the message is frozen like createUserMessage output')

	// The steered step answers without a log again: the turn still closes.
	host.listener('session/event')(agent.session, {
		type: 'assistant/message',
		data: { turn: 3, step: 2, message: { content: [{ type: 'text', text: LONG }] } }
	})
	await stopping({ agent, turn: 3, signal })
	assert.equal(agent.steered.length, 1, 'never more than once per turn')

	const state = await call(host)
	assert.equal(state.body.gate.count, 1)
	assert.equal(typeof state.body.gate.lastAt, 'number')

	playTurn(host, agent.session, 4, [LONG])
	await stopping({ agent, turn: 4, signal })
	assert.equal(agent.steered.length, 2, 'a new turn is checked again')
})

test('delivery gate lets through replies that carry a log, are short, or are not its business', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)
	const stopping = host.listener('agent/turn-stopping')
	const agent = fakeAgent()
	const signal = new AbortController().signal

	playTurn(host, agent.session, 1, [LONG])
	await stopping({ agent, turn: 1, signal })
	assert.equal(agent.steered.length, 0, 'switch off: no gate')

	await call(host, { method: 'POST', body: { enabled: true } })

	playTurn(host, agent.session, 2, [LONG + '\n\n## 六、核查记录\n\n| 来源 | 第一遍 |'])
	await stopping({ agent, turn: 2, signal })
	assert.equal(agent.steered.length, 0, 'a reply with a verification log passes')

	playTurn(host, agent.session, 3, ['好的，已开启学术模式。'])
	await stopping({ agent, turn: 3, signal })
	assert.equal(agent.steered.length, 0, 'a short reply passes')

	playTurn(host, agent.session, 4, ['**核查记录**\n已完成三遍核查。', LONG])
	await stopping({ agent, turn: 4, signal })
	assert.equal(agent.steered.length, 0, 'a log earlier in the same turn counts')

	playTurn(host, agent.session, 5, [LONG])
	const aborted = new AbortController()
	aborted.abort()
	await stopping({ agent, turn: 5, signal: aborted.signal })
	assert.equal(agent.steered.length, 0, 'a cancelled turn is left alone')

	playTurn(host, agent.session, 6, [LONG])
	await stopping({ agent, turn: 7, signal })
	assert.equal(agent.steered.length, 0, 'a turn the gate did not watch is left alone')

	await stopping({ agent: {}, turn: 6, signal })
	await stopping({ agent: { session: agent.session }, turn: 6, signal })
	assert.equal(agent.steered.length, 0, 'an agent without a session or steer() is left alone')

	playTurn(host, agent.session, 8, ['后面我会在核查记录中补充来源。' + LONG])
	await stopping({ agent, turn: 8, signal })
	assert.equal(agent.steered.length, 1, 'a sentence that only mentions the log does not count as one')
})

test('restores the switch after a restart', async () => {
	await mkdir(join(home, '.dsh'), { recursive: true })
	await writeFile(STATE_FILE, JSON.stringify({ enabled: true, title: MODE_TITLE }), 'utf8')
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)
	const { body } = await call(host)
	assert.equal(body.enabled, true, 'the route waits for the restore before answering')
	assert.equal(host.sections.length, 2)
})

test('refuses callers it should not serve', async () => {
	const host = createHost({ llm: fakeLlm({}) })
	plugin.apply(host.ctx)

	assert.equal((await call(host, { remoteAddress: '192.168.1.5' })).status, 403)
	assert.equal((await call(host, { headers: { origin: 'http://evil.example' } })).status, 403)
	assert.equal((await call(host, { headers: { origin: 'null' } })).status, 403)
	assert.equal((await call(host, { headers: { origin: 'http://127.0.0.1:7777' } })).status, 200)

	const form = await call(host, { method: 'POST', body: '{"enabled":true}', headers: { 'content-type': 'text/plain' } })
	assert.equal(form.status, 415, 'a cross-site form post cannot flip the switch')
	assert.equal((await call(host, { method: 'POST', body: 'not json' })).status, 400)
	assert.equal((await call(host, { method: 'POST', body: { enabled: 'yes' } })).status, 400)
	assert.equal((await call(host, { method: 'POST', body: 'x'.repeat(9000) })).status, 413)
	assert.equal((await call(host, { method: 'PUT', body: { enabled: true } })).status, 405)

	assert.equal((await call(host)).body.enabled, false, 'no refused call changed the state')
	assert.equal(host.sections.length, 0)
})
