/**
 * Demo bar (EMR popup spec §2.2, DESIGN_SYSTEM §5.6): portfolio chrome above the fictional EMR,
 * 40 px, follows the site theme. Left: the nuvovet DUR lockup and the patient switcher. Right: the
 * screen's one DUR disclaimer (교육용 프로토타입), how the DUR is shown (아일랜드 | 패널), the demo
 * guide, "방문 초기화", one "⋯" menu (widget theme and language, log export) and the case link.
 * The per-visit hint lives in the guide card. Below 1024 px everything but the patient switcher
 * and the marker moves into the "⋯" menu, so the bar stays one 40 px row.
 */

import { Compass, Download, Ellipsis, RotateCcw } from 'lucide-react'
import { BrandLockup } from '@/brand/Brand'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'

const MARKER_TOOLTIP = '교육용 프로토타입입니다. 임상 검증을 거치지 않았으며 진료에 사용하지 마십시오. 모든 검토는 이 브라우저 안에서만 실행됩니다.'

export function DemoBar({ visits, currentId, onVisit, widgetTheme, onWidgetTheme, locale, onLocale, onReset, onExport, caseHref, caseLabel, durLayout = 'island', onDurLayout, guideOpen, onGuide }) {
  return (
    <div
      className="flex h-10 shrink-0 flex-nowrap items-center gap-x-2 border-b border-border bg-background px-3 text-sm text-foreground print:hidden sm:px-4 lg:gap-x-3"
      data-emr="demo-bar"
    >
      <h1 className="flex shrink-0 items-center">
        <a href="#/" className="flex h-8 items-center rounded-sm" aria-label="nuvovet DUR EMR 데모: 사례 연구로">
          <BrandLockup product="dur" size="sm" suffix="EMR 데모" className="nvb-compact-sm" />
        </a>
      </h1>
      <label className="flex shrink-0 items-center gap-2">
        <span className="sr-only text-text-2 sm:not-sr-only">환자</span>
        <select
          className="h-7 max-w-28 rounded-md border border-input bg-background px-2 text-sm text-foreground sm:max-w-none"
          value={currentId}
          onChange={(e) => onVisit(e.target.value)}
          data-emr="visit-select"
        >
          {visits.map((v) => (
            <option key={v.id} value={v.id}>{v.id} {v.name}</option>
          ))}
        </select>
      </label>
      <div className="ml-auto flex shrink-0 items-center">
        <EnvironmentMarker label="교육용 프로토타입" tooltip={MARKER_TOOLTIP} />
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-text-2" id="emr-dur-layout">DUR 표시</span>
          <ToggleGroup
            type="single"
            size="sm"
            value={durLayout}
            onValueChange={(v) => v && onDurLayout?.(v)}
            aria-labelledby="emr-dur-layout"
          >
            <ToggleGroupItem value="island" className="px-2 text-xs" title="화면 위에 떠 있는 아일랜드: 끌어서 옮길 수 있습니다">아일랜드</ToggleGroupItem>
            <ToggleGroupItem value="docked" className="px-2 text-xs" title="오른쪽 360 px 패널에 고정 (1280 px 이상)">패널</ToggleGroupItem>
          </ToggleGroup>
        </span>
        <Button type="button" variant={guideOpen ? 'secondary' : 'ghost'} size="sm" onClick={onGuide} aria-pressed={Boolean(guideOpen)} title="데모 가이드를 보이거나 숨깁니다">
          <Compass aria-hidden="true" strokeWidth={1.5} />
          가이드
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} title="이 방문의 처방과 DUR 확인 기록을 처음 상태로 되돌립니다">
          <RotateCcw aria-hidden="true" strokeWidth={1.5} />
          방문 초기화
        </Button>
      </div>
      <div className="flex shrink-0 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="데모 설정">
              <Ellipsis aria-hidden="true" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="lg:hidden">
              <DropdownMenuLabel>DUR 표시</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={durLayout} onValueChange={(v) => v && onDurLayout?.(v)}>
                <DropdownMenuRadioItem value="island">아일랜드</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="docked">오른쪽 패널</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onGuide?.()}><Compass aria-hidden="true" strokeWidth={1.5} />{guideOpen ? '가이드 숨기기' : '가이드 보기'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onReset}><RotateCcw aria-hidden="true" strokeWidth={1.5} />방문 초기화</DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuLabel>위젯 테마</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={widgetTheme} onValueChange={(v) => v && onWidgetTheme(v)}>
              <DropdownMenuRadioItem value="light">라이트</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">다크</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>위젯 언어</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={locale} onValueChange={(v) => v && onLocale(v)}>
              <DropdownMenuRadioItem value="ko" lang="ko">한국어</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en" lang="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onExport}><Download aria-hidden="true" strokeWidth={1.5} />DUR 확인 기록 내보내기</DropdownMenuItem>
            <DropdownMenuItem asChild className="lg:hidden"><a href={caseHref}>{caseLabel}</a></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
        <a href={caseHref}>{caseLabel}</a>
      </Button>
    </div>
  )
}

export default DemoBar
