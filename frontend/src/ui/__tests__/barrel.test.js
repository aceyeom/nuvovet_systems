// The src/ui barrel (index.js) re-exports every primitive and pattern without name clashes.
import { describe, it, expect } from 'vitest'
import * as ui from '../index.js'

describe('src/ui barrel', () => {
  it('exports the shared components', () => {
    for (const name of [
      'Button', 'Input', 'InputGroup', 'Textarea', 'Label', 'Select', 'Checkbox', 'RadioGroup', 'Switch', 'Dialog',
      'AlertDialog', 'Sheet', 'Drawer', 'Popover', 'Tooltip', 'HoverCard', 'DropdownMenu', 'Command', 'Tabs', 'Table',
      'Badge', 'Card', 'Separator', 'ScrollArea', 'Skeleton', 'Kbd', 'Toaster', 'Sidebar', 'Toggle', 'ToggleGroup',
      'ChartContainer', 'Collapsible', 'Breadcrumb', 'Pagination', 'Alert',
      'SeverityBadge', 'DecisionBadge', 'FindingSeverity', 'StatusText', 'EvidenceTrail', 'EvidenceRow', 'CitationChip',
      'Num', 'Money', 'useTitle', 'Field', 'MoneyInput', 'Combobox', 'EmptyState', 'DataTable', 'DescriptionList',
      'MetricStrip', 'BarList', 'ProgressBar', 'PageHeader', 'Disclosure', 'CodeBlock', 'EnvironmentMarker', 'Logo',
      'ThemeToggle', 'LangToggle', 'Autocomplete', 'SuggestInput', 'rankSuggestions', 'formatJson', 'cn', 'setTheme', 'getTheme', 'useTheme', 'fmtWon', 'fmtWonCompact', 'withParticle',
    ]) {
      expect(ui[name], name).toBeTypeOf('function')
    }
  })
})
