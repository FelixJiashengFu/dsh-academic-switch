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

/** Name of the system-prompt section this plugin contributes. */
export const SECTION_NAME = 'academic-switch:discipline'

/**
 * Placement of that section.
 *
 * `@deepseek-ai/dsh-system-prompt` sorts sections by `order`, then by name, and
 * reserves these first-party slots: harness identity -1000, deployment persona
 * prefix 0, plan policy 500, team policy 600, PTC-only 800, file reference 900,
 * tool guidance from 1000 upward. 650 puts the discipline after both policies,
 * so plan mode keeps the last word on what may run, and before every tool
 * section, so the discipline frames how the tools are used.
 */
export const SECTION_ORDER = 650

/** Display name of the mode, used in logs, replies and the state file. */
export const MODE_TITLE = '学术模式'

/** File under `~/.dsh/` that remembers the switch across restarts. */
export const STATE_FILE_NAME = 'academic-switch.json'
