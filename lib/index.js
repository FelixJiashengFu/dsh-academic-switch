/**
 * Host half of 学术模式开关 (Academic Mode switch).
 *
 * While the switch is on:
 *  - one system-prompt section carries the academic discipline (three-pass
 *    source verification, three-pass logic review, multi-source research,
 *    delivery standard) into every model step (`systemPrompt.section`);
 *  - every model step is raised to the strongest reasoning effort its route
 *    advertises and to the model's full default output budget
 *    (`agent/request` waterfall).
 *
 * The switch itself is the browser half (lib/client.js). This half owns the
 * persisted state and serves it on a loopback route next to the toggle.
 *
 * @module dsh-academic-switch
 */

import { homedir } from 'node:os'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MODE_TITLE, ROUTE_STATE, SECTION_NAME, SECTION_ORDER, STATE_FILE_NAME } from './protocol.js'
import { ACADEMIC_PROMPT } from './prompt.js'

export const name = 'academic-switch'
export const inject = ['webServer']

/** Where the persisted switch state lives. */
const STATE_DIR = join(homedir(), '.dsh')
const STATE_FILE = join(STATE_DIR, STATE_FILE_NAME)

/** Largest request body the state route will read. */
const MAX_BODY = 8 * 1024

/** How long one resolved model capability is trusted before asking again. */
const INFO_TTL_MS = 10 * 60 * 1000

/** Most model routes whose capabilities are remembered at once. */
const INFO_CACHE_LIMIT = 32

/** Reported while the switch is on but the prompt registry is not reachable. */
const PROMPT_UNAVAILABLE = 'systemPrompt 服务暂不可用：推理强度与输出预算已拉满，学术纪律段落会在服务就绪后自动挂载'

/**
 * Strength of the reasoning efforts adapters are known to advertise. Unknown
 * ids are ignored while ranking; a route that advertises only unknown ids
 * keeps the entry its adapter listed last.
 */
const EFFORT_RANK = {
	none: 0,
	minimal: 1,
	low: 2,
	medium: 3,
	high: 4,
	xhigh: 5,
	max: 6,
	ultra: 7
}

/** An error that already knows which HTTP status it maps to. */
class HttpError extends Error {
	/**
	 * @param {number} status - HTTP status to answer with.
	 * @param {string} message - short reason for the caller.
	 */
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

/**
 * Mount the plugin.
 * @param {object} ctx - plugin context with `webServer`, plus the optional
 * `llm` and `systemPrompt` services, which are read when they are available.
 */
export function apply(ctx) {
	const logger = ctx.logger
	let enabled = false
	/** Failure of the prompt section, if the last mount attempt failed. */
	let sectionError = null
	/** Failure of the last request shaping, cleared by the next success. */
	let shapeError = null
	/** What the last shaped request actually asked for. */
	let lastApplied = null
	/** Live forks that can see the `systemPrompt` service, oldest first. */
	const promptForks = []
	/**
	 * The registered discipline section and the fork that owns it.
	 * @type {null | { fork: object, dispose: () => unknown }}
	 */
	let mounted = null
	/** @type {Map<string, { at: number, value: object }>} */
	const infoCache = new Map()

	// ── The discipline section ──────────────────────────────────────────────

	/** Register the discipline once, on the newest live registry fork. */
	function mountSection() {
		const fork = promptForks.length > 0 ? promptForks[promptForks.length - 1] : null
		if (mounted !== null && mounted.fork === fork) return
		if (fork === null) {
			sectionError = PROMPT_UNAVAILABLE
			return
		}
		// A section left on an older fork goes first, so the two registrations
		// never coexist under one name.
		if (mounted !== null) unmountSection()
		const dispose = fork.systemPrompt.section({
			name: SECTION_NAME,
			order: SECTION_ORDER,
			text: ACADEMIC_PROMPT,
			interpolate: false
		})
		mounted = { fork, dispose }
		sectionError = null
		logger?.info?.(`academic-switch: discipline section mounted (${SECTION_NAME} @ ${SECTION_ORDER})`)
	}

	/** Mount, recording a failure instead of throwing it at the caller. */
	function tryMount() {
		try { mountSection() } catch (error) { sectionError = describe(error) }
	}

	/** Take the discipline back out, tolerating a scope that already removed it. */
	function unmountSection() {
		const current = mounted
		mounted = null
		if (current === null) return
		try { current.dispose() } catch { /* already disposed together with its scope */ }
		logger?.info?.('academic-switch: discipline section unmounted')
	}

	// The registry can arrive after this plugin, go away and come back, and an
	// old fork can outlive a newer one. Each fork's cleanup removes only the
	// section that fork owns, then remounts on whatever fork is left, or reports
	// that none is.
	ctx.inject(['systemPrompt'], (sctx) => {
		sctx.effect(() => {
			promptForks.push(sctx)
			if (enabled) tryMount()
			return () => {
				const index = promptForks.indexOf(sctx)
				if (index >= 0) promptForks.splice(index, 1)
				if (mounted?.fork === sctx) unmountSection()
				if (enabled && mounted === null) tryMount()
			}
		}, 'academic-switch discipline section')
	})

	// ── The model step ──────────────────────────────────────────────────────

	/**
	 * Resolve one route's capability metadata, memoised briefly.
	 * @param {string} provider - registered provider route.
	 * @param {string} model - exact model id.
	 * @param {AbortSignal} [signal] - turn cancellation.
	 * @returns {Promise<object | undefined>} adapter metadata, when available.
	 */
	async function resolveInfo(provider, model, signal) {
		const key = provider + '\u0000' + model
		const hit = infoCache.get(key)
		const now = Date.now()
		if (hit !== undefined && now - hit.at < INFO_TTL_MS) return hit.value
		const llm = ctx.get('llm')
		if (llm === undefined || typeof llm.resolveModelInfo !== 'function') return undefined
		const value = await llm.resolveModelInfo(provider, model, signal)
		infoCache.delete(key)
		infoCache.set(key, { at: now, value })
		if (infoCache.size > INFO_CACHE_LIMIT) {
			// Cheap bound: drop the oldest insertion.
			const oldest = infoCache.keys().next()
			if (!oldest.done) infoCache.delete(oldest.value)
		}
		return value
	}

	/**
	 * Raise one frozen call configuration to the model's ceiling.
	 * @param {object} base - the configuration the agent loop would have used.
	 * @param {AbortSignal} [signal] - turn cancellation.
	 * @returns {Promise<object>} the configuration to use instead.
	 */
	async function shape(base, signal) {
		const provider = base?.provider
		const model = base?.model
		if (typeof provider !== 'string' || typeof model !== 'string') return base
		const info = await resolveInfo(provider, model, signal)
		if (info === undefined) return base

		const next = { ...base }
		let changed = false

		const cap = Number(info.defaultMaxTokens)
		if (Number.isFinite(cap) && cap > 0) {
			const ceiling = Math.floor(cap)
			const current = typeof base.maxTokens === 'number' ? base.maxTokens : 0
			if (current < ceiling) {
				next.maxTokens = ceiling
				changed = true
			}
		}

		const effort = pickMaxEffort(effortIds(info))
		if (effort !== undefined && effort !== base.reasoningEffort) {
			next.reasoningEffort = effort
			changed = true
		}

		return changed ? next : base
	}

	ctx.on('agent/request', async (payload, next) => {
		const base = await next()
		if (!enabled) return base
		try {
			const shaped = await shape(base, payload?.signal)
			shapeError = null
			if (shaped !== base) {
				lastApplied = {
					provider: shaped.provider,
					model: shaped.model,
					reasoningEffort: shaped.reasoningEffort ?? null,
					maxTokens: shaped.maxTokens ?? null,
					at: Date.now()
				}
			}
			return shaped
		} catch (error) {
			// A cancelled turn is not a failure of this plugin.
			if (payload?.signal?.aborted !== true) {
				shapeError = describe(error)
				logger?.warn?.('academic-switch: request shaping failed: ' + shapeError)
			}
			return base
		}
	})

	// ── Switch state ────────────────────────────────────────────────────────

	/**
	 * Flip the switch.
	 * @param {boolean} next - desired state.
	 */
	async function setEnabled(next) {
		if (next === enabled) return
		enabled = next
		if (next) {
			tryMount()
		} else {
			unmountSection()
			sectionError = null
		}
		await saveState(next)
		logger?.info?.(`academic-switch: ${next ? 'on' : 'off'}`)
	}

	/** @returns {Promise<boolean>} whether the switch was on before the restart. */
	async function loadState() {
		try {
			const parsed = JSON.parse(await readFile(STATE_FILE, 'utf8'))
			return parsed?.enabled === true
		} catch {
			return false
		}
	}

	/**
	 * Persist the switch state atomically, logging filesystem failures.
	 * @param {boolean} next - state to remember.
	 */
	async function saveState(next) {
		try {
			await mkdir(STATE_DIR, { recursive: true })
			const tmp = `${STATE_FILE}.tmp`
			await writeFile(tmp, JSON.stringify({ enabled: next, title: MODE_TITLE }, null, 2), 'utf8')
			await rename(tmp, STATE_FILE)
		} catch (error) {
			logger?.warn?.('academic-switch: could not persist state: ' + describe(error))
		}
	}

	// Restore the switch after a restart without blocking plugin start-up. The
	// state route waits for this, so the toggle never shows a stale "off".
	const restored = loadState()
		.then(async (wasEnabled) => {
			if (!wasEnabled) return
			await setEnabled(true)
			logger?.info?.('academic-switch: restored enabled state')
		})
		.catch((error) => {
			logger?.warn?.('academic-switch: could not restore state: ' + describe(error))
		})

	// ── HTTP surface for the composer switch ────────────────────────────────

	/** @returns {object} what the toggle needs to render. */
	function snapshot() {
		return {
			ok: true,
			enabled,
			lastError: sectionError ?? shapeError,
			applied: lastApplied
		}
	}

	ctx.inject(['webServer'], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: 'exact',
			path: ROUTE_STATE,
			async handler(req, res) {
				if (!isLoopback(req)) { sendJson(res, 403, { ok: false, error: 'loopback only' }); return }
				if (!originAllowed(req)) { sendJson(res, 403, { ok: false, error: 'cross-origin request refused' }); return }
				try {
					await restored
					if (req.method === 'GET') { sendJson(res, 200, snapshot()); return }
					if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
					if (!isJsonRequest(req)) { sendJson(res, 415, { ok: false, error: 'content-type must be application/json' }); return }
					const body = await readJson(req)
					if (typeof body?.enabled !== 'boolean') { sendJson(res, 400, { ok: false, error: 'enabled must be a boolean' }); return }
					await setEnabled(body.enabled)
					sendJson(res, 200, snapshot())
				} catch (error) {
					const status = error instanceof HttpError ? error.status : 500
					sendJson(res, status, { ok: false, enabled, error: describe(error) })
				}
			}
		}), 'academic-switch state route')
	})
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * The effort ids one route advertises, in adapter order.
 * @param {object | undefined} info - resolved model metadata.
 * @returns {string[]} effort ids.
 */
function effortIds(info) {
	const efforts = info?.reasoning?.efforts
	if (!Array.isArray(efforts)) return []
	const ids = []
	for (const entry of efforts) {
		const id = typeof entry === 'string' ? entry : entry?.id
		if (typeof id === 'string' && id.length > 0) ids.push(id)
	}
	return ids
}

/**
 * The strongest effort among the advertised ones.
 * @param {string[]} ids - advertised effort ids.
 * @returns {string | undefined} the id to request.
 */
function pickMaxEffort(ids) {
	if (ids.length === 0) return undefined
	// Adapters list efforts weakest first; fall back to that order when no id
	// carries a rank this plugin recognises.
	let best = ids[ids.length - 1]
	let bestRank = -1
	for (const id of ids) {
		const rank = EFFORT_RANK[id.toLowerCase()]
		if (rank === undefined) continue
		if (rank >= bestRank) {
			best = id
			bestRank = rank
		}
	}
	return best
}

/**
 * Serialise a JSON reply.
 * @param {object} res - node response.
 * @param {number} status - HTTP status.
 * @param {object} body - payload.
 */
function sendJson(res, status, body) {
	const payload = JSON.stringify(body)
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store',
		'content-length': Buffer.byteLength(payload)
	})
	res.end(payload)
}

/**
 * Read and decode a small JSON request body.
 * @param {AsyncIterable<Buffer>} req - node request.
 * @returns {Promise<object>} decoded body.
 */
async function readJson(req) {
	const chunks = []
	let size = 0
	for await (const chunk of req) {
		size += chunk.length
		if (size > MAX_BODY) throw new HttpError(413, '请求体过大')
		chunks.push(chunk)
	}
	if (size === 0) return {}
	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'))
	} catch {
		throw new HttpError(400, '请求体不是合法的 JSON')
	}
}

/** @param {object} req - node request. @returns {boolean} loopback caller. */
function isLoopback(req) {
	const address = req.socket?.remoteAddress ?? ''
	return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/**
 * Refuse browser requests that another site sent. Requests without an Origin
 * header (same-origin GET, local tools) pass; an http(s) Origin must name the
 * host the request was sent to, and the opaque `null` origin is refused.
 * @param {object} req - node request.
 * @returns {boolean} whether the caller may use the route.
 */
function originAllowed(req) {
	const origin = req.headers?.origin
	if (origin === undefined || origin === '') return true
	if (origin === 'null') return false
	let parsed
	try { parsed = new URL(origin) } catch { return false }
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true
	return parsed.host === req.headers?.host
}

/**
 * A JSON content type forces a CORS preflight for cross-site callers, which
 * this route never answers, so a form on another site cannot flip the switch.
 * @param {object} req - node request.
 * @returns {boolean} whether the body was declared as JSON.
 */
function isJsonRequest(req) {
	return String(req.headers?.['content-type'] ?? '').toLowerCase().startsWith('application/json')
}

/**
 * Turn anything into a short message.
 * @param {unknown} error - caught value.
 * @returns {string} message text.
 */
function describe(error) {
	return error instanceof Error ? error.message : String(error)
}
