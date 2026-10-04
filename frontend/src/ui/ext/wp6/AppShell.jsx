/**
 * AppShell (WP6, §5.3): 240 px sidebar on --surface-subtle (56 px collapsed, state in
 * localStorage['nv-sidebar']; a Sheet under 1024 px) and a 48 px top bar with the breadcrumb, the ⌘K
 * trigger, the environment marker, the theme toggle and the user menu.
 *
 * The router is not a src/ui dependency, so links come in through `LinkComponent` (called with `to`).
 * nav: [{ id, to, label, icon, count?, group? }]   footer: [{ id, to, label, icon, external? }]
 */
import { ChevronsLeft, ChevronsRight, Menu, Search } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { Kbd } from '@/ui/primitives/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from '@/ui/primitives/sidebar'
import { Logo } from '@/ui/patterns/Logo'
import { BrandLockup } from '@/brand/Brand'
import { fmtNum } from '@/ui/lib/format'
import { isMac } from './CommandMenu'

function NavLink({ item, active, LinkComponent }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.count != null ? `${item.label} ${fmtNum(item.count)}` : item.label}
        className="data-[active=true]:bg-brand-soft data-[active=true]:text-foreground data-[active=true]:[&>svg]:text-brand"
      >
        <LinkComponent to={item.to} aria-current={active ? 'page' : undefined} onClick={() => isMobile && setOpenMobile(false)}>
          {Icon ? <Icon aria-hidden="true" strokeWidth={1.5} /> : null}
          <span>{item.label}</span>
        </LinkComponent>
      </SidebarMenuButton>
      {item.count != null ? <SidebarMenuBadge className="num text-muted-foreground">{fmtNum(item.count)}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  )
}

function CollapseButton() {
  const { state, toggleSidebar, isMobile } = useSidebar()
  if (isMobile) return null
  const collapsed = state === 'collapsed'
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="펼치기" onClick={toggleSidebar} aria-expanded={!collapsed} aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'} className="text-text-2">
        {collapsed ? <ChevronsRight aria-hidden="true" strokeWidth={1.5} /> : <ChevronsLeft aria-hidden="true" strokeWidth={1.5} />}
        <span>접기</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function MobileMenuButton() {
  const { isMobile, toggleSidebar } = useSidebar()
  if (!isMobile) return null
  return (
    <Button variant="ghost" size="icon" aria-label="메뉴 열기" onClick={toggleSidebar} className="-ml-2">
      <Menu strokeWidth={1.5} />
    </Button>
  )
}

function CommandTrigger({ onOpen }) {
  const mac = isMac()
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="검색 및 명령 열기"
        aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}
        className="inline-flex h-8 w-64 items-center gap-2 rounded-md border border-input bg-background pr-1.5 pl-2.5 text-sm text-muted-foreground transition-colors duration-100 hover:bg-row-hover max-lg:hidden"
      >
        <Search aria-hidden="true" strokeWidth={1.5} className="size-4" />
        <span className="flex-1 text-left">검색</span>
        <Kbd>{mac ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>
      <Button variant="ghost" size="icon" aria-label="검색 및 명령 열기" onClick={onOpen} className="lg:hidden">
        <Search strokeWidth={1.5} />
      </Button>
    </>
  )
}

export function AppShell({ nav, activeId, footer = [], LinkComponent, homeTo = '/', product, brand, breadcrumb, onOpenCommand, marker, themeToggle, userMenu, children }) {
  const groups = []
  for (const item of nav) {
    const key = item.group || ''
    let g = groups.find((x) => x.key === key)
    if (!g) groups.push((g = { key, items: [] }))
    g.items.push(item)
  }
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" aria-label="주 메뉴">
        <SidebarHeader className="h-12 justify-center px-4 group-data-[collapsible=icon]:px-2">
          <LinkComponent to={homeTo} className="flex min-w-0 items-center rounded-sm" aria-label={`nuvovet ${product || ''}`.trim()}>
            {brand ? (
              <BrandLockup product={brand} size="sm" className="group-data-[collapsible=icon]:hidden" />
            ) : (
              <Logo product={product} className="group-data-[collapsible=icon]:hidden" />
            )}
            <span aria-hidden="true" className="hidden w-8 text-center text-lg font-bold tracking-[-0.03em] text-foreground group-data-[collapsible=icon]:inline">
              n
            </span>
          </LinkComponent>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="콘솔 화면" className="contents">
            {groups.map((g) => (
              <SidebarGroup key={g.key || 'main'} className="py-1">
                {g.key ? <SidebarGroupLabel>{g.key}</SidebarGroupLabel> : null}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {g.items.map((item) => (
                      <NavLink key={item.id} item={item} active={item.id === activeId} LinkComponent={LinkComponent} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter className="pb-3">
          <SidebarSeparator className="mx-0" />
          <SidebarMenu>
            {footer.map((f) => {
              const Icon = f.icon
              return (
                <SidebarMenuItem key={f.id}>
                  <SidebarMenuButton asChild tooltip={f.label} className="text-text-2">
                    <LinkComponent to={f.to}>
                      {Icon ? <Icon aria-hidden="true" strokeWidth={1.5} /> : null}
                      <span>{f.label}</span>
                    </LinkComponent>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            <CollapseButton />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-[var(--z-header)] flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-6 max-sm:gap-2 max-sm:px-4">
          <MobileMenuButton />
          <div className={cn('min-w-0 flex-1 overflow-hidden')}>{breadcrumb}</div>
          <CommandTrigger onOpen={onOpenCommand} />
          {marker}
          {themeToggle ? <div className="max-sm:hidden">{themeToggle}</div> : null}
          {userMenu}
        </header>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
