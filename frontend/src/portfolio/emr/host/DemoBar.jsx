/**
 * Demo bar (EMR popup spec §2.2, DESIGN_SYSTEM §5.6): portfolio chrome above the fictional EMR,
 * 40 px, follows the site theme. Left: the nuvovet DUR lockup and the patient switcher. Right: the
 * screen's one DUR disclaimer (교육용 프로토타입), how the DUR is shown (아일랜드 | 패널), the demo
 * guide, "방문 초기화", "사진 출처", one "설정" menu (widget theme and language, log export) and the
 * case link. Text controls only: no icons; the chosen layout carries an ink hairline (guide.css).
 * Below 1024 px everything but the patient switcher and the marker moves into the "설정" menu, so
 * the bar stays one 40 px row.
 */

import { ToggleGroup } from 'radix-ui'
import { BrandLockup } from '@/brand/Brand'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'
import './guide.css'

const MARKER_TOOLTIP = '교육용 프로토타입입니다. 임상 검증을 거치지 않았으며 진료에 사용하지 마십시오. 모든 검토는 이 브라우저 안에서만 실행됩니다.'
/** Photo credits live on the landing footer (src/brand/PhotoCredits.jsx). */
const CREDITS_HREF = '/#credits'

/**
 * The offline standalone build (its CSP allows data: images only) has no landing to link to and shows
 * no credited photo (only the CC0 나비), so it drops the "사진 출처" link.
 */
function hasSiteCredits() {
  try {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || ''
    return !/img-src\s+data:\s*(;|$)/.test(csp)
  } catch {
    return true
  }
}

export function DemoBar({ visits, currentId, onVisit, widgetTheme, onWidgetTheme, locale, onLocale, onReset, onExport, caseHref, caseLabel, durLayout = 'island', onDurLayout, guideOpen, onGuide }) {
  const credits = hasSiteCredits()
  return (
    <div className="nvd" data-emr="demo-bar">
      <h1 className="nvd-brand">
        <a href="#/" className="nvd-home" aria-label="nuvovet DUR EMR 데모: 사례 연구로">
          <BrandLockup product="dur" height={16} suffix="EMR 데모" className="nvb-compact-sm" />
        </a>
      </h1>
      <label className="nvd-visit">
        <span className="nvd-label">환자</span>
        <select className="nvd-select" value={currentId} onChange={(e) => onVisit(e.target.value)} data-emr="visit-select">
          {visits.map((v) => (
            <option key={v.id} value={v.id}>{v.id} {v.name}</option>
          ))}
        </select>
      </label>
      <div className="nvd-end">
        <EnvironmentMarker label="교육용 프로토타입" tooltip={MARKER_TOOLTIP} />
        <span className="nvd-rule nvd-wide" aria-hidden="true" />
        <span className="nvd-seg nvd-wide">
          <span className="nvd-label" id="emr-dur-layout">DUR 표시</span>
          <ToggleGroup.Root
            type="single"
            className="nvd-seg-items"
            value={durLayout}
            onValueChange={(v) => v && onDurLayout?.(v)}
            aria-labelledby="emr-dur-layout"
          >
            <ToggleGroup.Item value="island" className="nvd-seg-item" title="화면 위에 떠 있는 아일랜드: 끌어서 옮길 수 있습니다">아일랜드</ToggleGroup.Item>
            <ToggleGroup.Item value="docked" className="nvd-seg-item" title="오른쪽 360 px 패널에 고정 (1280 px 이상)">패널</ToggleGroup.Item>
          </ToggleGroup.Root>
        </span>
        <span className="nvd-rule nvd-wide" aria-hidden="true" />
        <span className="nvd-group">
          <button type="button" className="nvd-text nvd-wide" onClick={onGuide} aria-pressed={Boolean(guideOpen)} title="데모 가이드를 보이거나 숨깁니다">가이드</button>
          <button type="button" className="nvd-text nvd-wide" onClick={onReset} title="이 방문의 처방과 DUR 확인 기록을 처음 상태로 되돌립니다">방문 초기화</button>
          {credits ? <a className="nvd-text nvd-wide nvd-credits" href={CREDITS_HREF} title="환자 사진의 출처와 라이선스">사진 출처</a> : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="nvd-text" aria-label="데모 설정">설정</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="lg:hidden">
                <DropdownMenuLabel>DUR 표시</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={durLayout} onValueChange={(v) => v && onDurLayout?.(v)}>
                  <DropdownMenuRadioItem value="island" className="nvd-radio">아일랜드</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="docked" className="nvd-radio">오른쪽 패널</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onGuide?.()}>{guideOpen ? '가이드 숨기기' : '가이드 보기'}</DropdownMenuItem>
                <DropdownMenuItem onSelect={onReset}>방문 초기화</DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuLabel>위젯 테마</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={widgetTheme} onValueChange={(v) => v && onWidgetTheme(v)}>
                <DropdownMenuRadioItem value="light" className="nvd-radio">라이트</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="nvd-radio">다크</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>위젯 언어</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={locale} onValueChange={(v) => v && onLocale(v)}>
                <DropdownMenuRadioItem value="ko" lang="ko" className="nvd-radio">한국어</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en" lang="en" className="nvd-radio">English</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onExport}>DUR 확인 기록 내보내기</DropdownMenuItem>
              {credits ? <DropdownMenuItem asChild className="nvd-menu-credits"><a href={CREDITS_HREF}>사진 출처</a></DropdownMenuItem> : null}
              <DropdownMenuItem asChild className="lg:hidden"><a href={caseHref}>{caseLabel}</a></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
        <a className="nvd-text nvd-link nvd-wide" href={caseHref}>{caseLabel}</a>
      </div>
    </div>
  )
}

export default DemoBar
