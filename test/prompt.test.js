// The discipline text is the product; these checks keep its required parts in place.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACADEMIC_IDENTITY, ACADEMIC_PROMPT, DELIVERY_GATE_NOTICE } from '../lib/prompt.js'
import { VERIFICATION_LOG_PATTERN } from '../lib/protocol.js'

test('the identity section names the mode and keeps safety and plan mode on top', () => {
	assert.ok(ACADEMIC_IDENTITY.startsWith('## 学术模式（已开启）'))
	assert.ok(ACADEMIC_IDENTITY.includes('学术研究者'))
	assert.ok(ACADEMIC_IDENTITY.includes('安全、权限与计划模式的规则不受影响'))
})

test('the discipline contains every required part', () => {
	const required = [
		'## 学术纪律',
		'### 一、开工前：研究计划',
		'### 二、底线',
		'### 三、多方面查找资料',
		'### 四、资料真实性：三遍核查',
		'**第一遍 · 存在性与元数据**',
		'**第二遍 · 内容一致性**',
		'**第三遍 · 独立交叉与可信度**',
		'### 五、逻辑严谨性：三遍检查',
		'**第一遍 · 结构**',
		'**第二遍 · 推理与计算**',
		'**第三遍 · 对抗审查**',
		'### 六、交付标准',
		'### 七、交付前自检',
		'### 八、诚实与边界',
		'标题固定写作「核查记录」',
		'GB/T 7714—2025',
		'APA 第 7 版'
	]
	for (const part of required) assert.ok(ACADEMIC_PROMPT.includes(part), `missing: ${part}`)
})

test('chapters appear in order and the checklist has exactly ten items', () => {
	const headings = [...ACADEMIC_PROMPT.matchAll(/^### (.+)$/gmu)].map((m) => m[1].slice(0, 2))
	assert.deepEqual(headings, ['一、', '二、', '三、', '四、', '五、', '六、', '七、', '八、'])
	const checklist = ACADEMIC_PROMPT.split('### 七、交付前自检')[1].split('### 八、')[0]
	assert.equal([...checklist.matchAll(/^\d+\. /gmu)].length, 10)
})

test('the heading the discipline asks for is the heading the gate looks for', () => {
	for (const line of ['核查记录', '## 核查记录', '### 六、核查记录', '**核查记录**', '**附：核查记录**', '## Verification log', '  ### 7. Verification Log']) {
		assert.ok(VERIFICATION_LOG_PATTERN.test(line), `should count: ${line}`)
	}
	for (const line of ['后面我会在核查记录中补充来源。', '见下文的核查记录', '- 核查记录：略', '这里没有 verification log']) {
		assert.equal(VERIFICATION_LOG_PATTERN.test(line), false, `should not count: ${line}`)
	}
	assert.ok(DELIVERY_GATE_NOTICE.includes('核查记录'))
	assert.ok(DELIVERY_GATE_NOTICE.includes('本条无需核查记录'), 'the notice offers a way out for non-deliverables')
})

test('no text holds prompt-variable syntax and every text stays within a bounded size', () => {
	for (const text of [ACADEMIC_IDENTITY, ACADEMIC_PROMPT, DELIVERY_GATE_NOTICE]) {
		assert.equal(text.includes('{{'), false)
		assert.equal(text.includes('${'), false)
	}
	assert.ok(ACADEMIC_IDENTITY.length < 400, `identity is ${ACADEMIC_IDENTITY.length} characters`)
	assert.ok(ACADEMIC_PROMPT.length < 6500, `discipline is ${ACADEMIC_PROMPT.length} characters`)
	assert.ok(DELIVERY_GATE_NOTICE.length < 400, `notice is ${DELIVERY_GATE_NOTICE.length} characters`)
})
