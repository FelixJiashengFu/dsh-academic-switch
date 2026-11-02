// The discipline text is the product; these checks keep its required parts in place.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACADEMIC_PROMPT } from '../lib/prompt.js'

test('contains every required part of the discipline', () => {
	const required = [
		'## 学术模式（已开启）',
		'### 一、底线',
		'### 二、多方面查找资料',
		'### 三、资料真实性：三遍核查',
		'**第一遍 · 存在性与元数据**',
		'**第二遍 · 内容一致性**',
		'**第三遍 · 独立交叉与可信度**',
		'### 四、逻辑严谨性：三遍检查',
		'**第一遍 · 结构**',
		'**第二遍 · 推理与计算**',
		'**第三遍 · 对抗审查**',
		'### 五、交付标准',
		'### 六、诚实与边界',
		'GB/T 7714—2025',
		'APA 第 7 版'
	]
	for (const part of required) assert.ok(ACADEMIC_PROMPT.includes(part), `missing: ${part}`)
})

test('holds no prompt-variable syntax and stays within a bounded size', () => {
	assert.equal(ACADEMIC_PROMPT.includes('{{'), false)
	assert.equal(ACADEMIC_PROMPT.includes('${'), false)
	assert.ok(ACADEMIC_PROMPT.length < 6000, `prompt is ${ACADEMIC_PROMPT.length} characters`)
})
