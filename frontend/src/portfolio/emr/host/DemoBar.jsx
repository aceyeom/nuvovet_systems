/**
 * Demo bar (EMR popup spec §2.2, DESIGN_SYSTEM §5.6): portfolio chrome above the fictional EMR,
 * 40 px, NuvoVet tokens, follows the site theme. It carries the screen's one DUR disclaimer
 * (교육용 프로토타입), the visit switcher, the hint, the widget's theme and locale (the host stays
 * Korean and light), "방문 초기화", "기록 내보내기" and the link back to the case.
 *
 * Below 1024 px the bar stays one 40 px row (engineering review item 9): logo, visit switcher,
 * the disclaimer marker and a "설정" menu holding the widget theme and language, the two demo
 * actions and the case link.
 */

import { Download, Ellipsis, RotateCcw } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'
import { LangToggle } from '@/ui/patterns/LangToggle'
import { Logo } from '@/ui/patterns/Logo'

const MARKER_TOOLTIP = '교육용 프로토타입입니다. 임상 검증을 거치지 않았으며 진료에 사용하지 마십시오. 모든 검토는 이 브라우저 안에서만 실행됩니다.'

export function DemoBar({ visits, currentId, onVisit, hint, widgetTheme, onWidgetTheme, locale, onLocale, onReset, onExport, caseHref, caseLabel }) {
  return (
    <div
      className="flex h-10 shrink-0 flex-nowrap items-center gap-x-2 border-b border-border bg-background px-3 text-sm text-foreground print:hidden sm:px-4 lg:gap-x-4"
      data-emr="demo-bar"
    >
      <h1 className="flex shrink-0 items-center">
        <a href="#/" className="flex h-8 items-center rounded-sm" aria-label="NuvoVet DUR 데모: 사례 연구로">
          <Logo product="DUR 데모" />
        </a>
      </h1>
      <label className="flex shrink-0 items-center gap-2">
        <span className="sr-only text-text-2 sm:not-sr-only">방문</span>
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
      {hint ? (
        <p className="hidden min-w-0 truncate text-text-2 xl:block" title={`시도: ${hint}`}>
          <span className="font-medium text-foreground">시도</span> {hint}
        </p>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center">
        <EnvironmentMarker label="교육용 프로토타입" tooltip={MARKER_TOOLTIP} />
      </div>
      <div className="flex shrink-0 items-center lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="데모 설정">
              <Ellipsis aria-hidden="true" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
            <DropdownMenuItem onSelect={onReset}><RotateCcw aria-hidden="true" strokeWidth={1.5} />방문 초기화</DropdownMenuItem>
            <DropdownMenuItem onSelect={onExport}><Download aria-hidden="true" strokeWidth={1.5} />기록 내보내기</DropdownMenuItem>
            <DropdownMenuItem asChild><a href={caseHref}>{caseLabel}</a></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-text-2" id="emr-widget-theme">위젯</span>
          <ToggleGroup
            type="single"
            size="sm"
            value={widgetTheme}
            onValueChange={(v) => v && onWidgetTheme(v)}
            aria-labelledby="emr-widget-theme"
          >
            <ToggleGroupItem value="light" className="px-2 text-xs">라이트</ToggleGroupItem>
            <ToggleGroupItem value="dark" className="px-2 text-xs">다크</ToggleGroupItem>
          </ToggleGroup>
        </span>
        <LangToggle value={locale} onChange={onLocale} label="위젯 언어" />
        <Button type="button" variant="ghost" size="sm" onClick={onReset} title="이 방문의 처방과 DUR 확인 기록을 처음 상태로 되돌립니다">
          <RotateCcw aria-hidden="true" strokeWidth={1.5} />
          방문 초기화
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onExport} title="DUR 확인 기록을 JSON 파일로 내려받습니다">
          <Download aria-hidden="true" strokeWidth={1.5} />
          기록 내보내기
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={caseHref}>{caseLabel}</a>
        </Button>
      </div>
    </div>
  )
}

export default DemoBar
