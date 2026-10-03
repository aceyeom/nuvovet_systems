// The Tailwind bridge wipes the default palette, type scale, shadows, radii and md/2xl breakpoints
// (DESIGN_SYSTEM.md §2.5, WP0 acceptance). Compiled with @tailwindcss/node's compile() API.
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { compile } from '@tailwindcss/node'

const UI = path.resolve(import.meta.dirname, '..')
let compiler

beforeAll(async () => {
  const css = `@import "tailwindcss";\n${fs.readFileSync(path.join(UI, 'theme.css'), 'utf8')}`
  compiler = await compile(css, { base: UI, onDependency() {} })
})

function utilities(cls) {
  const out = compiler.build([cls])
  const i = out.indexOf('@layer utilities')
  return i < 0 ? '' : out.slice(i)
}
const compiles = (cls) => {
  const esc = cls.replace(/[:/[\]().%]/g, (c) => `\\${c}`)
  return utilities(cls).includes(`.${esc}`)
}

describe('theme.css bridge', () => {
  for (const cls of ['bg-blue-500', 'text-4xl', 'shadow-md', 'rounded-2xl', 'md:p-2', 'text-gray-500', 'bg-white', 'text-black', 'shadow-sm', '2xl:p-2', 'text-7xl']) {
    it(`${cls} produces no CSS`, () => expect(compiles(cls)).toBe(false))
  }
  for (const cls of [
    'text-foreground',
    'bg-sev-critical/10',
    'rounded-full',
    'wide:p-2',
    'touch:h-10',
    'bg-sev-critical-solid',
    'text-on-solid',
    'shadow-pop',
    'shadow-modal',
    'rounded-sm',
    'rounded-xl',
    'text-xs',
    'text-6xl',
    'bg-brand-soft',
    'border-border-strong',
    'lg:p-2',
    'dark:bg-muted',
    'bg-row-hover',
    'text-text-2',
  ]) {
    it(`${cls} compiles`, () => expect(compiles(cls)).toBe(true))
  }
  it('type scale values are the §3.3 values', () => {
    expect(utilities('text-sm')).toMatch(/font-size:\s*13px/)
    expect(utilities('text-sm')).toMatch(/line-height:\s*var\(--tw-leading,\s*20px\)/)
    expect(utilities('text-base')).toMatch(/font-size:\s*14px/)
    expect(utilities('text-xs')).toMatch(/font-size:\s*12px/)
  })
  it('dark: fires for explicit data-theme and for system dark', () => {
    const css = utilities('dark:bg-muted')
    expect(css).toMatch(/prefers-color-scheme:\s*dark/)
    expect(css).toContain('data-theme="dark"')
    expect(css).toContain(':not([data-theme="light"])')
  })
  it('touch: is the coarse-pointer media query', () => {
    expect(utilities('touch:h-10')).toMatch(/pointer:\s*coarse/)
  })
})
