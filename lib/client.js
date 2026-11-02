/**
 * Browser half of 学术模式开关: the deep-blue switch beside the composer.
 *
 * The host side of `@deepseek-ai/dsh-client-modules` ships every installed
 * package that declares `dsh.client` inside its combo script, so this file must
 * stay dependency-free apart from `react`: no JSX, no bundler, no imports.
 *
 * @module dsh-academic-switch/client
 */

window.__ModuleLoader__.load({
	id: 'dsh-academic-switch',
	factory: (require) => {
		const React = require('react')
		/** Short alias for `React.createElement`. */
		const h = React.createElement

		const SEAT = 'conversation.input.left'
		const ENTRY_ID = 'dsh-academic-switch-toggle'
		// Keep in sync with lib/protocol.js; the browser half cannot import it.
		const ROUTE_STATE = '/plugins/dsh-academic-switch/state'
		const STYLE_ID = 'dsh-academic-switch/toggle.css'
		const ACTIVE_CLASS = 'dsh-academic-switch-active'

		const CSS = `
.dsw-acs-toggle {
	--acs-blue-1: #5b8fd6;
	--acs-blue-2: #2f6fc4;
	--acs-blue-3: #0f4d92;
	--acs-blue-4: #0a3566;
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 7px;
	height: 26px;
	padding: 0 8px 0 7px;
	border-radius: 999px;
	border: 1px solid color-mix(in srgb, var(--acs-blue-3) 40%, transparent);
	background: transparent;
	color: var(--dsw-alias-label-secondary, #8a8f98);
	font: inherit;
	font-size: 12px;
	line-height: 1;
	letter-spacing: 0.02em;
	cursor: pointer;
	white-space: nowrap;
	overflow: hidden;
	transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 160ms ease;
	-webkit-app-region: no-drag;
}
.dsw-acs-toggle:hover {
	color: var(--acs-blue-2);
	background: color-mix(in srgb, var(--acs-blue-2) 10%, transparent);
	border-color: color-mix(in srgb, var(--acs-blue-3) 60%, transparent);
}
.dsw-acs-toggle:focus-visible {
	outline: 2px solid var(--acs-blue-2);
	outline-offset: 2px;
}
.dsw-acs-toggle[data-state="on"] {
	color: #ffffff;
	background: linear-gradient(135deg, var(--acs-blue-1) 0%, var(--acs-blue-3) 55%, var(--acs-blue-4) 100%);
	border-color: var(--acs-blue-4);
	box-shadow:
		inset 0 0 0 1px rgba(255, 255, 255, 0.18),
		0 1px 2px rgba(10, 30, 60, 0.25),
		0 0 12px color-mix(in srgb, var(--acs-blue-2) 45%, transparent);
	font-weight: 700;
}
.dsw-acs-toggle[data-state="on"]:hover {
	background: linear-gradient(135deg, #6f9ee0 0%, #1a5fae 55%, var(--acs-blue-4) 100%);
}
.dsw-acs-toggle[data-state="error"] {
	color: var(--dsw-alias-state-error-primary, #e5484d);
	border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 55%, transparent);
	background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 12%, transparent);
}
.dsw-acs-toggle[data-busy="true"] {
	cursor: progress;
}
.dsw-acs-toggle svg { flex: none; display: block; }
.dsw-acs-label { display: inline-block; }
.dsw-acs-track {
	position: relative;
	width: 24px;
	height: 13px;
	border-radius: 999px;
	background: color-mix(in srgb, currentColor 22%, transparent);
	box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
	flex: none;
	transition: background-color 140ms ease;
}
.dsw-acs-knob {
	position: absolute;
	top: 1.5px;
	left: 1.5px;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.85;
	transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 140ms ease, opacity 140ms ease;
}
.dsw-acs-toggle[data-state="on"] .dsw-acs-track {
	background: rgba(255, 255, 255, 0.28);
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}
.dsw-acs-toggle[data-state="on"] .dsw-acs-knob {
	transform: translateX(11px);
	background: #ffffff;
	opacity: 1;
	box-shadow: 0 1px 2px rgba(5, 20, 45, 0.45);
}
.dsw-acs-spinner {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 1.5px solid color-mix(in srgb, currentColor 30%, transparent);
	border-top-color: currentColor;
	animation: dsw-acs-spin 720ms linear infinite;
	flex: none;
}
@keyframes dsw-acs-spin { to { transform: rotate(360deg); } }

/* While the mode is on, the whole shell borrows the academic blue accent. */
body.${ACTIVE_CLASS} {
	--dsw-alias-brand-primary: #0f4d92;
	--dsw-alias-brand-primary-hover: #1a5fae;
}
@media (prefers-reduced-motion: reduce) {
	.dsw-acs-toggle, .dsw-acs-knob, .dsw-acs-track { transition: none; }
	.dsw-acs-spinner { animation-duration: 2s; }
}
`

		/**
		 * The mortarboard that marks the control.
		 * @returns {object} React element.
		 */
		function Cap() {
			return h('svg', {
				className: 'dsw-acs-cap',
				width: 15,
				height: 15,
				viewBox: '0 0 16 16',
				'aria-hidden': true,
				fill: 'none'
			},
				h('path', {
					d: 'M8 2.4 0.8 5.8 8 9.2l7.2-3.4z',
					fill: 'currentColor',
					stroke: 'currentColor',
					strokeWidth: 0.6,
					strokeLinejoin: 'round'
				}),
				h('path', {
					d: 'M3.7 7.6v3c0 1 1.9 2.1 4.3 2.1s4.3-1.1 4.3-2.1v-3L8 9.7z',
					fill: 'currentColor',
					opacity: 0.85
				}),
				h('path', {
					d: 'M14.3 6.2v4.1',
					stroke: 'currentColor',
					strokeWidth: 1,
					strokeLinecap: 'round'
				}),
				h('circle', { cx: 14.3, cy: 11.1, r: 0.95, fill: 'currentColor' })
			)
		}

		/**
		 * Build the tooltip for one state.
		 * @param {string} state - current state machine value.
		 * @param {string} message - last error text, when any.
		 * @param {object | null} applied - what the last shaped request asked for.
		 * @param {object | null} gate - delivery-gate counters from the host.
		 * @returns {string} tooltip text.
		 */
		function tooltip(state, message, applied, gate) {
			if (state === 'on') {
				const parts = []
				if (applied !== null && typeof applied === 'object') {
					if (typeof applied.model === 'string') parts.push(applied.model)
					if (typeof applied.reasoningEffort === 'string') parts.push('思考 ' + applied.reasoningEffort)
					if (typeof applied.maxTokens === 'number') parts.push('输出上限 ' + applied.maxTokens)
				}
				const detail = parts.length > 0 ? '\n最近一次：' + parts.join(' · ') : '\n下一条消息起生效。'
				const gated = gate !== null && typeof gate === 'object' && typeof gate.count === 'number' && gate.count > 0
					? '\n交付前核查已退回补查 ' + gate.count + ' 次。'
					: ''
				const warning = message ? '\n注意：' + message : ''
				return '学术模式已开启，对所有会话生效：学术身份与学术纪律（三遍资料核查、三遍逻辑检查），最高推理强度与最大输出预算；较长的回复缺少「核查记录」时会被退回补查一次。'
					+ detail + gated + warning + '\n点击关闭。'
			}
			if (state === 'error') return `开关失败：${message || '未知错误'}（点击重试）`
			return '学术模式已关闭。点击开启后对所有会话生效：加入学术身份与学术纪律（三遍资料核查、三遍逻辑检查、多方面查找资料），把每一步推到模型最强的推理强度与最大输出预算，并在交付前检查是否附「核查记录」。'
		}

		/**
		 * The switch.
		 *
		 * State machine: `unknown` while the first GET is in flight, then `off` /
		 * `on`; `error` only parks on a failed POST, and a click from `error`
		 * retries the state that failed rather than guessing a new one.
		 *
		 * @returns {object} React element.
		 */
		function Toggle() {
			const [status, setStatus] = React.useState('unknown')
			const [busy, setBusy] = React.useState(false)
			const [message, setMessage] = React.useState('')
			const [applied, setApplied] = React.useState(null)
			const [gate, setGate] = React.useState(null)
			const alive = React.useRef(true)
			const target = React.useRef(null)

			React.useEffect(() => {
				alive.current = true
				fetch(ROUTE_STATE, { credentials: 'same-origin', cache: 'no-store' })
					.then((response) => response.json())
					.then((body) => {
						if (!alive.current) return
						setStatus(body?.enabled === true ? 'on' : 'off')
						setApplied(body?.applied ?? null)
						setGate(body?.gate ?? null)
						setMessage(body?.lastError ? String(body.lastError) : '')
					})
					.catch(() => {
						if (alive.current) setStatus('off')
					})
				return () => { alive.current = false }
			}, [])

			const on = status === 'on'

			// Tint the rest of the shell while the mode is on.
			React.useEffect(() => {
				const body = document.body
				if (on) body.classList.add(ACTIVE_CLASS)
				else body.classList.remove(ACTIVE_CLASS)
				return () => { body.classList.remove(ACTIVE_CLASS) }
			}, [on])

			const flip = React.useCallback(() => {
				if (busy || status === 'unknown') return
				const next = status === 'error' && typeof target.current === 'boolean'
					? target.current
					: status !== 'on'
				target.current = next
				setBusy(true)
				setStatus(next ? 'on' : 'off')
				fetch(ROUTE_STATE, {
					method: 'POST',
					credentials: 'same-origin',
					cache: 'no-store',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ enabled: next })
				})
					.then(async (response) => {
						const body = await response.json().catch(() => ({}))
						if (!alive.current) return
						if (response.ok && body?.ok === true) {
							setStatus(body.enabled === true ? 'on' : 'off')
							setApplied(body?.applied ?? null)
							setGate(body?.gate ?? null)
							setMessage(body?.lastError ? String(body.lastError) : '')
						} else {
							setStatus('error')
							setMessage(String(body?.error ?? `HTTP ${response.status}`))
						}
					})
					.catch((error) => {
						if (!alive.current) return
						setStatus('error')
						setMessage(error instanceof Error ? error.message : String(error))
					})
					.finally(() => { if (alive.current) setBusy(false) })
			}, [busy, status])

			return h('button', {
				type: 'button',
				className: 'dsw-acs-toggle',
				'data-state': status,
				'data-busy': busy ? 'true' : 'false',
				role: 'switch',
				'aria-checked': on,
				'aria-label': on ? '关闭学术模式' : '开启学术模式',
				title: tooltip(status, message, applied, gate),
				onClick: flip,
				disabled: busy || status === 'unknown'
			},
				busy ? h('span', { className: 'dsw-acs-spinner' }) : h(Cap),
				h('span', { className: 'dsw-acs-label' }, '学术'),
				h('span', { className: 'dsw-acs-track' },
					h('span', { className: 'dsw-acs-knob' })
				)
			)
		}

		/**
		 * Inject the stylesheet once, and remove it when the entry is disposed.
		 * @returns {() => void} cleanup.
		 */
		function installStyles() {
			if (document.getElementById(STYLE_ID) !== null) return () => {}
			const style = document.createElement('style')
			style.id = STYLE_ID
			style.textContent = CSS
			document.head.appendChild(style)
			return () => {
				style.remove()
				document.body.classList.remove(ACTIVE_CLASS)
			}
		}

		/**
		 * Plugin entry point.
		 * @param {object} ctx - client context with `slots`.
		 */
		function apply(ctx) {
			ctx.effect(installStyles, 'academic-switch toggle styles')
			ctx.slots.inject(SEAT, () => ctx.slots.register({
				name: SEAT,
				id: ENTRY_ID,
				order: 130
			}, Toggle))
		}

		const module = { exports: {} }
		module.exports.apply = apply
		module.exports.inject = ['slots']
		return module.exports
	}
})
