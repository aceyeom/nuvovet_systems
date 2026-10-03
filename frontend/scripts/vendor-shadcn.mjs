// Copied from the stack research project (DESIGN_SYSTEM.md §2.2). Run scripts/restyle-shadcn.mjs afterwards.
// Vendor shadcn/ui (new-york-v4, Tailwind v4) components WITHOUT ui.shadcn.com.
//
// ui.shadcn.com is blocked by the egress proxy, but raw.githubusercontent.com is not.
// We fetch the canonical TSX sources from the shadcn-ui/ui repo, wrap each in a
// registry-item JSON, and let the official CLI install them from local files
// (it transpiles TSX -> JSX when components.json has "tsx": false and rewrites aliases).
// REGISTRY_URL is pointed at raw GitHub only so the CLI's colors/neutral.json lookup succeeds.
//
//   node scripts/vendor-shadcn.mjs button dialog popover ...
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const REF = process.env.SHADCN_REF || '295a1f114a138f23b5dfee0e0c6812394dfeb90c' // shadcn-ui/ui main on 2026-10-03 (git ls-remote); bump deliberately
const RAW = `https://raw.githubusercontent.com/shadcn-ui/ui/${REF}/apps/v4`
const OUT = path.resolve('.shadcn-vendor')
fs.mkdirSync(OUT, { recursive: true })

const NPM_DEPS = {
  'radix-ui': /from "radix-ui"/, 'class-variance-authority': /class-variance-authority/,
  cmdk: /from "cmdk"/, sonner: /from "sonner"/, vaul: /from "vaul"/,
  'react-resizable-panels': /react-resizable-panels/, recharts: /from "recharts"/,
  'lucide-react': /lucide-react/, '@base-ui/react': /@base-ui\/react/,
}

async function get(p) {
  const r = await fetch(`${RAW}/${p}`)
  if (!r.ok) throw new Error(`${r.status} ${p}`)
  return r.text()
}

function patch(name, src) {
  src = src.replace(/from "cn"/g, 'from "@/ui/cn"')
  if (name === 'sonner') {
    // next-themes is a Next.js dependency; NuvoVet's theme lives in <html data-theme> (src/ui/theme.js).
    src = src.replace('import { useTheme } from "next-themes"', 'import { useTheme } from "@/ui/theme"')
  }
  return src
}

const names = process.argv.slice(2)
const items = []
// lib/utils first (the CLI writes it to the "utils" alias)
items.push({ name: 'utils', type: 'registry:lib', dependencies: ['clsx', 'tailwind-merge'],
  files: [{ path: 'registry/new-york-v4/lib/utils.ts', type: 'registry:lib',
    content: 'import { clsx, type ClassValue } from "clsx"\nimport { twMerge } from "tailwind-merge"\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}\n' }] })
if (names.includes('sidebar')) {
  items.push({ name: 'use-mobile', type: 'registry:hook', files: [{ path: 'registry/new-york-v4/hooks/use-mobile.ts', type: 'registry:hook', content: await get('registry/new-york-v4/hooks/use-mobile.ts') }] })
}
for (const name of names) {
  const content = patch(name, await get(`registry/new-york-v4/ui/${name}.tsx`))
  const dependencies = Object.entries(NPM_DEPS).filter(([, re]) => re.test(content)).map(([d]) => d)
  items.push({ name, type: 'registry:ui', dependencies,
    files: [{ path: `registry/new-york-v4/ui/${name}.tsx`, type: 'registry:ui', content }] })
}
const files = items.map((it) => {
  const f = path.join(OUT, `${it.name}.json`)
  fs.writeFileSync(f, JSON.stringify({ $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...it }, null, 2))
  return f
})
execSync(`npx -y shadcn@4.21.1 add ${files.join(' ')} --yes --overwrite`, {
  stdio: 'inherit', env: { ...process.env, REGISTRY_URL: `${RAW}/public/r` },
})
