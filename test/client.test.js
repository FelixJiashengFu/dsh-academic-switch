// Browser-half smoke test: run lib/client.js in a VM with a stand-in module
// loader, React and DOM, and check what it registers and renders.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { ROUTE_STATE } from '../lib/protocol.js'

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

/** Hooks return their initial values and effects are not run. */
const React = {
	createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
	useState: (initial) => [initial, () => {}],
	useRef: (initial) => ({ current: initial }),
	useEffect: () => {},
	useCallback: (fn) => fn
}

/** Flatten an element tree into its text. */
function text(node) {
	if (typeof node === 'string') return node
	if (node === null || typeof node !== 'object') return ''
	return (node.children ?? []).map(text).join('')
}

test('registers one switch in the composer seat and renders it in the loading state', () => {
	const registrations = []
	const appended = []
	const sandbox = {
		window: { __ModuleLoader__: { load: (registration) => registrations.push(registration) } },
		document: {
			getElementById: () => null,
			createElement: (tag) => ({ tag, remove() {} }),
			head: { appendChild: (element) => appended.push(element) },
			body: { classList: { add() {}, remove() {} } }
		},
		fetch: () => new Promise(() => {})
	}
	vm.runInNewContext(code, sandbox)

	assert.equal(registrations.length, 1)
	assert.equal(registrations[0].id, 'dsh-academic-switch')

	const exports = registrations[0].factory((specifier) => {
		assert.equal(specifier, 'react', 'the bundle requires nothing but react')
		return React
	})
	assert.deepEqual([...exports.inject], ['slots'])

	const registered = []
	let seat = null
	exports.apply({
		effect: (execute) => execute(),
		slots: {
			inject: (name, callback) => { seat = name; return callback() },
			register: (entry, component) => { registered.push({ entry, component }); return () => {} }
		}
	})

	assert.equal(appended.length, 1, 'one stylesheet is installed')
	assert.equal(appended[0].id, 'dsh-academic-switch/toggle.css')
	assert.match(appended[0].textContent, /\.dsw-acs-toggle/)

	assert.equal(seat, 'conversation.input.left')
	assert.equal(registered.length, 1)
	assert.equal(registered[0].entry.name, 'conversation.input.left')
	assert.equal(registered[0].entry.id, 'dsh-academic-switch-toggle')
	assert.equal(registered[0].entry.order, 130)

	const element = registered[0].component()
	assert.equal(element.type, 'button')
	assert.equal(element.props.role, 'switch')
	assert.equal(element.props['data-state'], 'unknown')
	assert.equal(element.props.disabled, true, 'not clickable before the first state read')
	assert.equal(element.props['aria-checked'], false)
	assert.match(element.props.title, /学术模式已关闭/)
	assert.equal(text(element), '学术')
})

test('the browser half talks to the same route the host serves', () => {
	assert.ok(code.includes(`'${ROUTE_STATE}'`), 'lib/client.js repeats ROUTE_STATE from lib/protocol.js')
})
