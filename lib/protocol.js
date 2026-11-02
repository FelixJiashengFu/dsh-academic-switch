/**
 * Constants shared by the host half and the browser half.
 *
 * The browser bundle is standalone (no imports), so lib/client.js repeats the
 * route identifier and says so where it does. Edit this file first and keep the
 * browser copy in sync.
 *
 * @module dsh-academic-switch/protocol
 */

/** Loopback route the composer switch talks to. */
export const ROUTE_STATE = '/plugins/dsh-academic-switch/state'

/**
 * `@deepseek-ai/dsh-system-prompt` sorts sections by `order`, then by name, and
 * reserves these first-party slots: harness identity -1000, deployment persona
 * prefix 0, plan policy 500, team policy 600, PTC-only 800, file reference 900,
 * tool guidance from 1000 upward.
 */

/** Name of the short identity section. */
export const IDENTITY_SECTION_NAME = 'academic-switch:identity'

/** Right after the deployment persona prefix, so the mode reads as identity. */
export const IDENTITY_SECTION_ORDER = 100

/** Name of the discipline section. */
export const SECTION_NAME = 'academic-switch:discipline'

/**
 * After the plan and team policies, so plan mode keeps the last word on what
 * may run, and before every tool section, so the discipline frames how the
 * tools are used.
 */
export const SECTION_ORDER = 650

/** Display name of the mode, used in logs, replies and the state file. */
export const MODE_TITLE = '学术模式'

/** File under `~/.dsh/` that remembers the switch across restarts. */
export const STATE_FILE_NAME = 'academic-switch.json'

/**
 * Producer source of the delivery-gate notice. The label matters: an unlabeled
 * steering message would render as something the user typed.
 */
export const NOTICE_SOURCE_KIND = 'academic-switch'

/** One-line summary the transcript shows for the notice. */
export const NOTICE_SUMMARY = '学术模式 · 交付前核查'

/**
 * Shortest final reply the delivery gate treats as a deliverable. Shorter
 * replies (confirmations, clarifying questions) end without a check.
 */
export const GATE_MIN_CHARS = 600

/**
 * A verification log counts when its title opens a line, or sits in a markdown
 * heading or a bold label after a short prefix such as a section number
 * ("## 六、核查记录", "**附：核查记录**"). A sentence that merely mentions the
 * log does not count.
 */
export const VERIFICATION_LOG_PATTERN = /^[ \t]*(?:#{1,6}[ \t]+[^\n]{0,12}?|\*\*[^\n]{0,12}?)?(?:核查记录|verification log)/imu
