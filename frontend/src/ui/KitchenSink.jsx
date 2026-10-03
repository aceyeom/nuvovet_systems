/**
 * Dev-only kitchen sink (DESIGN_SYSTEM.md §8.2 WP0): /__ui renders every primitive and pattern;
 * /__ui/golden renders the three golden reference screens (§9.9). Registered in App.jsx only when
 * import.meta.env.DEV, so it never ships. Switch light / dark with the ThemeToggle in the header.
 */
import { useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Bold, FileText, Info, Plus, Search, Settings, TriangleAlert, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Textarea } from '@/ui/primitives/textarea'
import { Label } from '@/ui/primitives/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Checkbox } from '@/ui/primitives/checkbox'
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group'
import { Switch } from '@/ui/primitives/switch'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/primitives/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/ui/primitives/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/ui/primitives/sheet'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/ui/primitives/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/primitives/tooltip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/ui/primitives/hover-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/ui/primitives/command'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table'
import { Badge } from '@/ui/primitives/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card'
import { Separator } from '@/ui/primitives/separator'
import { ScrollArea } from '@/ui/primitives/scroll-area'
import { Skeleton } from '@/ui/primitives/skeleton'
import { Kbd } from '@/ui/primitives/kbd'
import { Toaster } from '@/ui/primitives/sonner'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/ui/primitives/sidebar'
import { Toggle } from '@/ui/primitives/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/ui/primitives/chart'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/ui/primitives/input-group'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/ui/primitives/pagination'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'

import { SeverityBadge, DecisionBadge, FindingSeverity, StatusText, SEVERITY, DECISIONS, DOSE_STATUS } from '@/ui/patterns/status'
import { EvidenceTrail, EvidenceRow, CitationChip } from '@/ui/patterns/EvidenceTrail'
import { Num, Money } from '@/ui/patterns/Num'
import { Field, MoneyInput } from '@/ui/patterns/Field'
import { Combobox } from '@/ui/patterns/Combobox'
import { SuggestInput } from '@/ui/patterns/Autocomplete'
import { EmptyState } from '@/ui/patterns/EmptyState'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { DescriptionList } from '@/ui/patterns/DescriptionList'
import { MetricStrip, BarList, ProgressBar } from '@/ui/patterns/metrics'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { Disclosure } from '@/ui/patterns/Disclosure'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'
import { Logo } from '@/ui/patterns/Logo'
import { ThemeToggle } from '@/ui/patterns/ThemeToggle'
import { LangToggle } from '@/ui/patterns/LangToggle'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtDate, fmtNum, fmtPct, fmtWonCompact } from '@/ui/lib/format'
import { withParticle } from '@/ui/lib/particle'

import GoldenQueue from '@/ui/golden/GoldenQueue'
import GoldenClaimHeader from '@/ui/golden/GoldenClaimHeader'
import GoldenDurCard from '@/ui/golden/GoldenDurCard'

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 id={`${id}-h`} className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-6">
      <div className="w-40 shrink-0 pt-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

// Reference data for the kit only (fictional).
const CLAIMS = [
  { id: 'SYN-2026-00220', clinic: '샘플동물병원 32', billed: 7383700, decision: 'review', flagged: true },
  { id: 'SYN-2026-00107', clinic: '샘플동물병원 4', billed: 412000, decision: 'auto_approve', flagged: false },
  { id: 'SYN-2026-00031', clinic: '샘플동물병원 18', billed: 1290500, decision: 'pend', flagged: false },
  { id: 'SYN-2026-00288', clinic: '샘플동물병원 9', billed: 2045000, decision: 'deny_recommended', flagged: true },
  { id: 'SYN-2026-00150', clinic: '샘플동물병원 21', billed: 96000, decision: 'auto_approve', flagged: false },
]
const col = createColumnHelper()
const CLAIM_COLUMNS = [
  col.accessor('id', { header: '청구 ID', meta: { id: true }, cell: (i) => <a href={`#${i.getValue()}`}>{i.getValue()}</a> }),
  col.accessor('clinic', { header: '병원' }),
  col.accessor('billed', { header: '청구액 (원)', meta: { num: true, emphasizeWhenFlagged: true }, cell: (i) => fmtNum(i.getValue()) }),
  col.accessor('decision', { header: '판정', enableSorting: false, cell: (i) => <DecisionBadge decision={i.getValue()} /> }),
]
const CHART_DATA = [
  { m: '4월', v: 2.1 },
  { m: '5월', v: 3.4 },
  { m: '6월', v: 2.8 },
  { m: '7월', v: 3.9 },
  { m: '8월', v: 2.6 },
  { m: '9월', v: 3.6 },
]
const CHART_CONFIG = { v: { label: '검토 대상 (백만 원)', color: 'var(--chart-1)' } }
const DRUG_OPTIONS = [
  { value: 'apoquel', label: '아포퀠', hint: '오클라시티닙' },
  { value: 'metacam', label: '메타캄', hint: '멜록시캄' },
  { value: 'rimadyl', label: '리마딜', hint: '카프로펜' },
  { value: 'convenia', label: '컨버니아', hint: '세포베신' },
]

const BREEDS = [
  { value: 'collie', label: '러프 콜리' },
  { value: 'poodle', label: '푸들' },
  { value: 'maltese', label: '말티즈' },
  { value: 'bichon', label: '비숑 프리제' },
  { value: 'kshort', label: '코리안 숏헤어' },
]

function Kit() {
  useTitle('UI 키트', 'nuvovet')
  const [selected, setSelected] = useState('SYN-2026-00107')
  const [density, setDensity] = useState('default')
  const [lang, setLang] = useState('ko')
  const [money, setMoney] = useState(30000)
  const [breed, setBreed] = useState('collie')
  const [drug, setDrug] = useState('')
  const [sorting, setSorting] = useState([])
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="개요" className="flex flex-col gap-4">
        <PageHeader
          title="UI 키트"
          meta="토큰, 기본 컴포넌트, 패턴. 개발 서버에서만 열립니다."
          actions={
            <>
              <EnvironmentMarker label="합성 데이터" tooltip="모든 청구와 병원은 합성 데이터입니다. 실제 청구가 아닙니다." />
              <Button variant="outline" asChild>
                <Link to="/__ui/golden">기준 화면 보기</Link>
              </Button>
            </>
          }
        />
      </section>

      <Section id="type" title="글자 크기와 숫자">
        <div className="flex flex-col gap-2">
          <p className="text-xs">text-xs 12/16 · 표 보조 정보, 배지, 툴팁</p>
          <p className="text-sm">text-sm 13/20 · 표 셀, 메뉴, 버튼</p>
          <p className="text-base">text-base 14/22 · 앱 본문 기본</p>
          <p className="text-lg">text-lg 16/24 · 마케팅 본문, 패널 제목</p>
          <p className="text-xl font-semibold">text-xl 20/28 · 앱 화면 제목</p>
          <p className="text-2xl font-semibold">text-2xl 24/32 · 지표 값</p>
          <p className="text-3xl font-bold">text-3xl 32/40 · 마케팅 h2</p>
          <p className="text-5xl font-bold">text-5xl 48/56</p>
        </div>
        <Row label=".num / .id / .mono">
          <span className="num">7,383,700</span>
          <span className="id">SYN-2026-00220</span>
          <span className="id text-text-2">pricing.regional_outlier</span>
          <code className="mono">POST /api/claims/adjudicate</code>
        </Row>
        <Row label="ss06 (1 / l / I)">
          <span data-check="ss06" className="text-lg">1l Il 0.1 mg/kg · 일일 1회 · 간질 · 일반 사료</span>
        </Row>
        <Row label="ledger-total">
          <div className="w-80">
            <div className="flex justify-between py-2 text-sm"><span>청구</span><Money value={7383700} /></div>
            <div className="ledger-total flex justify-between py-2 text-sm font-semibold"><span>지급 예정</span><Money value={5000000} /></div>
          </div>
        </Row>
        <Row label="format / particle">
          <span className="num">{fmtWonCompact(156935799)}</span>
          <span className="num">{fmtWonCompact(18409436)}</span>
          <span className="num">{fmtPct(0.5673)}</span>
          <span>{fmtDate('2026-09-17', 'prose')}</span>
          <span>{withParticle('나비', '으로/로')} 돌아가기</span>
          <Num value={24} digits={1} unit="kg" />
        </Row>
      </Section>

      <Section id="buttons" title="버튼">
        <Row label="variant">
          <Button>청구 승인</Button>
          <Button variant="secondary">서류 요청</Button>
          <Button variant="outline">내보내기 (CSV)</Button>
          <Button variant="ghost">메모</Button>
          <Button variant="link">API 연동 보기</Button>
          <Button variant="destructive">지급 거절 권고 확정</Button>
        </Row>
        <Row label="size">
          <Button size="sm">sm 28</Button>
          <Button>default 32</Button>
          <Button size="lg">lg 40</Button>
          <Button size="icon" aria-label="설정">
            <Settings strokeWidth={1.5} />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="추가">
            <Plus strokeWidth={1.5} />
          </Button>
        </Row>
        <Row label="state">
          <Button disabled>비활성</Button>
          <Button
            loading={busy}
            onClick={() => {
              setBusy(true)
              setTimeout(() => setBusy(false), 1500)
            }}
          >
            사전 점검 실행
          </Button>
          <Button variant="outline">
            <FileText strokeWidth={1.5} />
            보호자 안내문 인쇄
          </Button>
        </Row>
        <Row label="toggle / segmented">
          <Toggle aria-label="굵게">
            <Bold strokeWidth={1.5} />
          </Toggle>
          <ToggleGroup type="single" defaultValue="all" aria-label="보기">
            <ToggleGroupItem value="all">전체</ToggleGroupItem>
            <ToggleGroupItem value="open">처리 대상</ToggleGroupItem>
            <ToggleGroupItem value="auto">자동 승인</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" size="sm" value={density} onValueChange={(v) => v && setDensity(v)} aria-label="밀도">
            <ToggleGroupItem value="compact">좁게</ToggleGroupItem>
            <ToggleGroupItem value="default">기본</ToggleGroupItem>
          </ToggleGroup>
          <ThemeToggle />
          <LangToggle value={lang} onChange={setLang} />
        </Row>
        <Row label="toggle group / multiple">
          <ToggleGroup type="multiple" defaultValue={['receipt', 'detail']} aria-label="발급할 서류">
            <ToggleGroupItem value="receipt">영수증</ToggleGroupItem>
            <ToggleGroupItem value="detail">진료비 세부내역서</ToggleGroupItem>
            <ToggleGroupItem value="diagnosis">진단서</ToggleGroupItem>
            <ToggleGroupItem value="opinion">소견서</ToggleGroupItem>
          </ToggleGroup>
        </Row>
      </Section>

      <Section id="inputs" title="입력">
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="동물 이름" help="보호자가 부르는 이름을 그대로 입력하세요.">
            <Input defaultValue="초코" />
          </Field>
          <Field label="체중" error="체중을 입력하세요.">
            <InputGroup>
              <InputGroupInput aria-label="체중" inputMode="decimal" placeholder="0.0" className="num text-left" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>kg</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field label="단가">
            <MoneyInput value={money} onChange={setMoney} />
          </Field>
          <Field label="품종">
            <Combobox options={BREEDS} value={breed} onChange={setBreed} searchPlaceholder="품종 검색" />
          </Field>
          <Field label="약품명" help="목록에 없는 이름도 그대로 입력할 수 있습니다.">
            <SuggestInput value={drug} onValueChange={setDrug} options={DRUG_OPTIONS} />
          </Field>
          <Field label="보험사">
            <Select defaultValue="a">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="보험사를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">기본 (보험사 미지정)</SelectItem>
                <SelectItem value="b">샘플손해보험</SelectItem>
                <SelectItem value="c">가상화재</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="진료일" help="2026년 10월 3일">
            <Input type="date" defaultValue="2026-10-03" />
          </Field>
          <Field label="메모" className="sm:col-span-2">
            <Textarea placeholder="심사 메모를 입력하세요" />
          </Field>
          <div className="flex items-center gap-2">
            <Checkbox id="consent" defaultChecked />
            <Label htmlFor="consent">보호자 동의를 받았습니다</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sw" defaultChecked />
            <Label htmlFor="sw">합성 데이터만 보기</Label>
          </div>
          <RadioGroup defaultValue="j2" aria-label="예외 사유">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="j2" id="r1" />
              <Label htmlFor="r1">임상적 판단: 이점이 위험보다 큼</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="data" id="r2" />
              <Label htmlFor="r2">환자 정보가 실제와 다름</Label>
            </div>
          </RadioGroup>
          <div className="flex items-center gap-2">
            <InputGroup>
              <InputGroupAddon>
                <Search strokeWidth={1.5} />
              </InputGroupAddon>
              <InputGroupInput aria-label="청구 검색" placeholder="청구 ID·병원·진단" />
            </InputGroup>
          </div>
        </div>
      </Section>

      <Section id="status" title="상태 표시">
        <Row label="SeverityBadge sm">
          {Object.keys(SEVERITY).map((k) => (
            <SeverityBadge key={k} level={k} />
          ))}
        </Row>
        <Row label="SeverityBadge md / en">
          {Object.keys(SEVERITY).map((k) => (
            <SeverityBadge key={k} level={k} size="md" lang="en" />
          ))}
        </Row>
        <Row label="related">
          <SeverityBadge level="contraindicated" related label="관련" />
          <SeverityBadge level="moderate" related />
        </Row>
        <Row label="DecisionBadge">
          {Object.keys(DECISIONS).map((k) => (
            <DecisionBadge key={k} decision={k} />
          ))}
        </Row>
        <Row label="DecisionBadge + icon">
          {Object.keys(DECISIONS).map((k) => (
            <DecisionBadge key={k} decision={k} icon />
          ))}
        </Row>
        <Row label="FindingSeverity">
          <FindingSeverity severity="critical" />
          <FindingSeverity severity="warning" />
          <FindingSeverity severity="info" />
        </Row>
        <Row label="StatusText">
          {Object.keys(DOSE_STATUS).map((k) => (
            <StatusText key={k} status={k} />
          ))}
        </Row>
        <Row label="Badge">
          <Badge>중립</Badge>
          <Badge variant="outline">허가 외 사용</Badge>
          <Badge variant="id">POST</Badge>
          <Badge variant="id">SUR-003</Badge>
          <EnvironmentMarker label="교육용 프로토타입" />
        </Row>
        <div className="flex max-w-3xl flex-col gap-3">
          <Alert>
            <Info strokeWidth={1.5} />
            <AlertTitle>합성 데이터로 생성한 정답 라벨 기준입니다</AlertTitle>
            <AlertDescription>실제 청구 성능을 뜻하지 않습니다.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <TriangleAlert strokeWidth={1.5} />
            <AlertTitle>보완 필요 2건</AlertTitle>
            <AlertDescription>진단서와 항목별 영수증을 첨부하세요.</AlertDescription>
          </Alert>
          <Alert variant="critical">
            <TriangleAlert strokeWidth={1.5} />
            <AlertTitle>API에 연결할 수 없습니다</AlertTitle>
            <AlertDescription>백엔드(:8000)가 실행 중인지 확인하세요.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section id="overlays" title="떠 있는 레이어">
        <Row label="overlay">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">툴팁</Button>
              </TooltipTrigger>
              <TooltipContent>
                서류 요청: 판정 전에 보호자에게 서류를 더 받습니다. <Kbd>R</Kbd>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">팝오버</Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm">지역 P90은 같은 지역 병원 청구액의 90번째 백분위수입니다.</PopoverContent>
          </Popover>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">상세</Button>
            </HoverCardTrigger>
            <HoverCardContent className="text-sm">합성 데이터 기준 지역별 진료비 분위수</HoverCardContent>
          </HoverCard>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">메뉴</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>김 심사역 (가상)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                설정 <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2 strokeWidth={1.5} />
                메모 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">대화상자</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>보호자 동의 내용</DialogTitle>
                <DialogDescription>영수증 이미지는 글자 인식을 위해 외부 서비스로 전송됩니다.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">닫기</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">확인 대화상자</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>지급 거절 권고를 확정할까요?</AlertDialogTitle>
                <AlertDialogDescription>확정하면 이 청구의 판정이 바뀌고 이력에 남습니다.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>처방으로 돌아가기</AlertDialogCancel>
                <AlertDialogAction className="bg-sev-critical-solid text-on-solid hover:bg-sev-critical-solid/90">확정</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">시트</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>필터</SheetTitle>
                <SheetDescription>보험사와 채널로 좁힙니다.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">드로어</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>점검 결과</DrawerTitle>
                <DrawerDescription>보완 필요 2건</DrawerDescription>
              </DrawerHeader>
            </DrawerContent>
          </Drawer>
          <Button variant="outline" onClick={() => toast('메모를 저장했습니다', { description: '데모: 이 브라우저에만 저장됩니다' })}>
            토스트
          </Button>
        </Row>
        <div className="max-w-md overflow-hidden rounded-lg border border-border">
          <Command>
            <CommandInput placeholder="이동, 청구, 병원 검색" />
            <CommandList>
              <CommandEmpty>결과가 없습니다</CommandEmpty>
              <CommandGroup heading="이동">
                <CommandItem>
                  개요<CommandShortcut>G O</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  청구 심사<CommandShortcut>G C</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </Section>

      <Section id="nav" title="탐색">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#nav">청구 심사</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="id">SYN-2026-00220</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">
              소견 <span className="num text-xs text-muted-foreground">8</span>
            </TabsTrigger>
            <TabsTrigger value="b">진료 항목</TabsTrigger>
            <TabsTrigger value="c">지급 계산</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="pt-2 text-sm text-text-2">
            밑줄 탭 (기본)
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="a">
          <TabsList variant="segmented">
            <TabsTrigger value="a">curl</TabsTrigger>
            <TabsTrigger value="b">Python</TabsTrigger>
            <TabsTrigger value="c">Node</TabsTrigger>
          </TabsList>
        </Tabs>
        <Pagination className="mx-0 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#nav" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#nav" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#nav">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#nav" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="h-64 w-60 overflow-hidden rounded-lg border border-border">
          <SidebarProvider className="min-h-0">
            <Sidebar collapsible="none" className="w-full">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>청구 심사</SidebarGroupLabel>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#nav">개요</a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive>
                        <a href="#nav" aria-current="page">
                          청구 심사 <span className="num ml-auto text-xs text-muted-foreground">135</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          </SidebarProvider>
        </div>
        <Row label="Kbd">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <Kbd>/</Kbd>
        </Row>
      </Section>

      <Section id="data" title="데이터 표시">
        <MetricStrip
          items={[
            { label: '청구', value: `${fmtNum(312)}건` },
            { label: '청구액', value: fmtWonCompact(156935799) },
            { label: '검토 대상', value: fmtWonCompact(18409436) },
            { label: '자동 승인', value: fmtPct(0.5673) },
          ]}
        />
        <DataTable
          aria-label="청구 목록"
          columns={CLAIM_COLUMNS}
          data={CLAIMS}
          sorting={sorting}
          onSortingChange={setSorting}
          density={density}
          isFlagged={(r) => r.flagged}
          selectedId={selected}
          onSelect={setSelected}
          keyboard
          pageSize={3}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>표준 코드</TableHead>
              <TableHead>표준명</TableHead>
              <TableHead className="num">금액 (원)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="id">SUR-003</TableCell>
              <TableCell>위장관 이물 제거술</TableCell>
              <TableCell className="num">4,727,600</TableCell>
            </TableRow>
            <TableRow data-state="selected">
              <TableCell className="id">LAB-012</TableCell>
              <TableCell>혈액검사 (CBC)</TableCell>
              <TableCell className="num">35,000</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <DescriptionList
          items={[
            { label: '병원', value: '샘플동물병원 32' },
            { label: '지역', value: '서울' },
            { label: '진료일', value: '2026-09-17', num: true },
            { label: '청구액', value: '7,383,700원', num: true },
          ]}
        />
        <div className="grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">주요 소견 규칙</h3>
            <BarList
              items={[
                { label: '보장 제외 항목', value: 128 },
                { label: '지역 P90 초과', value: 64 },
                { label: '진단과 처방 불일치', value: 31 },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">검토 대상 비중</h3>
            <ProgressBar value={42} label="검토 대상 비중 42%" />
            <ProgressBar value={18} muted label="검토 대상 비중 18% (청구 10건 미만)" />
          </div>
        </div>
        <EvidenceTrail className="max-w-3xl">
          <EvidenceRow
            badge={<FindingSeverity severity="critical" />}
            title="장절개술 금액이 지역 기준을 넘습니다"
            impact="1,607,600원"
            ruleId="pricing.regional_outlier"
            version="v1.0"
            basis="지역 P90 3,120,000원"
            citation={<CitationChip label="진료비 벤치마크" cite="합성 데이터 기준 지역별 진료비 분위수" doi="10.0000/example" />}
            notChecked={['연령', '임신/수유']}
          />
          <EvidenceRow badge={<FindingSeverity severity="warning" />} title="진단서가 첨부되지 않았습니다" ruleId="coverage.missing_document" version="v1.0" />
        </EvidenceTrail>
        <div className="max-w-xl">
          <ChartContainer config={CHART_CONFIG} className="h-[200px] w-full">
            <BarChart data={CHART_DATA} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="v" fill="var(--color-v)" radius={0} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </div>
        <CodeBlock
          className="max-w-3xl"
          title="POST /api/claims/adjudicate"
          json={{ claim_id: 'SYN-2026-00220', policy: { insurer_id: 'default', docs: ['receipt', 'detail', 'diagnosis', 'opinion'] }, lines: [{ code: 'SUR-003', amount: 1250000 }, { code: 'LAB-011', amount: 88000 }, { code: 'IMG-002', amount: 150000 }] }}
          jsonOptions={{ maxItems: 1 }}
        />
        <CodeBlock
          className="max-w-3xl"
          tabs={[
            { value: 'curl', label: 'curl', code: 'curl -X POST https://api.example.com/api/claims/adjudicate \\\n  -H "Content-Type: application/json" \\\n  -d @claim.json' },
            { value: 'py', label: 'Python', code: 'import requests\nrequests.post("https://api.example.com/api/claims/adjudicate", json=claim)' },
          ]}
        />
      </Section>

      <Section id="layout" title="묶음과 빈 상태">
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>환자·보험</CardTitle>
              <CardDescription>보험사와 동물 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-text-2">카드는 묶인 보조 내용에만 씁니다.</CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">
                저장
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardContent>
              <EmptyState title="검토 대상이 없습니다" action={<Button size="sm" variant="outline">전체 청구 보기</Button>} />
            </CardContent>
          </Card>
        </div>
        <Disclosure title="벤치마크 없는 항목" meta="61개">
          <p className="text-sm text-text-2">벤치마크가 없는 항목은 금액 검토에서 빠집니다.</p>
        </Disclosure>
        <ScrollArea className="h-24 w-72 rounded-md border border-border">
          <div className="p-3 text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i}>항목 {i + 1}</div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex max-w-md flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>
    </div>
  )
}

function Golden() {
  useTitle('기준 화면', 'UI 키트', 'nuvovet')
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="기준 화면" meta="WP5·WP6·WP3가 같은 클래스를 씁니다 (DESIGN_SYSTEM.md §9.9)." />
      <GoldenQueue />
      <GoldenClaimHeader />
      <GoldenDurCard />
    </div>
  )
}

export default function KitchenSink() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-[var(--z-header)] flex h-12 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
        <Link to="/__ui" className="rounded-sm">
          <Logo product="UI 키트" />
        </Link>
        <nav aria-label="UI 키트" className="hidden items-center gap-1 text-sm sm:flex">
          <Button variant="ghost" size="sm" asChild>
            <NavLink to="/__ui" end>컴포넌트</NavLink>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <NavLink to="/__ui/golden">기준 화면</NavLink>
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <EnvironmentMarker label="개발 전용" className="max-sm:hidden" />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
        <Routes>
          <Route index element={<Kit />} />
          <Route path="golden" element={<Golden />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
