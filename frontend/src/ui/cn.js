import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge must know the NuvoVet theme keys (§2.5), otherwise it reads e.g. `shadow-pop` or
// `text-5xl` wrongly and drops a conflicting class instead of the overridden one.
const twMerge = extendTailwindMerge({
  override: {
    theme: {
      text: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '5xl', '6xl'],
      shadow: ['pop', 'modal'],
      radius: ['sm', 'md', 'lg', 'xl'],
      breakpoint: ['sm', 'lg', 'xl', 'wide'],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
