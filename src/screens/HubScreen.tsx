import { useEffect, useState } from 'react'
import { CHICKEN, companyTypeById, industryById, rankById, statLabels } from '../data'
import {
  agePenalty,
  canChooseTrack,
  canOpenChickenShop,
  canSpendGapYear,
  formatSalary,
  HIRING_STAGES,
  nextPromotion,
  NEGOTIATION_RAISES,
  overworkDrain,
  STAGE_LABELS,
  type ApplicationResult,
  type GameState,
  type JobOffer,
  type JobPosting,
  type PromotionTarget,
  type NegotiationRaise,
  type StatKey,
} from '../engine'
import { useGame } from '../store/game'
import { Badge, Button, Card, Screen, StatBars, StatusHeader, Title } from '../ui'
import { JOB_LOSS_TRIGGERS, majorEvents } from './majorEvents'

export function HubScreen({ game }: { game: GameState }) {
  const { acceptOffer, negotiateOffer, declineOffers, chooseTrack, nextYear, retire, apply, spendGapYear, openChickenShop, lastApplication, dismissApplication } = useGame()
  const [confirmRetire, setConfirmRetire] = useState(false)
  const postings = game.postings ?? []
  const appsLeft = game.applicationsLeft ?? 0
  const gapYear = canSpendGapYear(game)
  // 결과 팝업이 단계별로 보여주는 동안은 방금 합격한 회사의 제안을 목록에서 숨긴다 (결과가 뒤에서 먼저 보이지 않게)
  const pendingReveal = lastApplication?.posting.company.name
  const visibleOffers = game.offers.map((offer, index) => ({ offer, index })).filter(({ offer }) => offer.company.name !== pendingReveal)
  // 왜 실직했는지 (작년 연말 기록 기준, 공백기를 보낸 뒤에는 표시하지 않음)
  const lastRecord = game.history.at(-1)
  const jobLoss = lastRecord ? majorEvents(lastRecord, game).find((m) => JOB_LOSS_TRIGGERS.includes(m.trigger)) : undefined

  const footer = gapYear ? (
    <Button variant="secondary" onClick={spendGapYear}>
      취업 준비하며 1년 보내기
    </Button>
  ) : (
    <Button onClick={nextYear} disabled={game.unemployed}>
      {game.unemployed ? '새 회사를 먼저 구해야 해요' : `${game.calendarYear}년으로`}
    </Button>
  )

  return (
    <Screen footer={footer}>
      <StatusHeader game={game} />

      <Title eyebrow={game.unemployed ? '지금은 회사가 없어요' : `${game.careerYear - 1}년차를 마쳤어요`}>확인할 일</Title>

      {game.unemployed && (
        <Card className="bg-red-50">
          {jobLoss && !gapYear && (
            <p className="mb-1 text-xs font-medium text-red-400">
              {jobLoss.emoji} {jobLoss.title}
            </p>
          )}
          <p className="font-semibold text-red-600">{gapYear ? '이번에는 모두 떨어졌어요' : '지금은 실직 상태예요'}</p>
          <p className="text-sm text-red-500">
            {gapYear
              ? '연봉 없이 1년 동안 취업을 준비하고 다시 지원할 수 있어요. 생활비로 자산이 줄어요.'
              : `아래 채용 공고에 지원해서 합격한 곳으로 가야 다음 해로 넘어갈 수 있어요. 남은 지원 ${appsLeft}곳.`}
          </p>
        </Card>
      )}

      {canOpenChickenShop(game) && <ChickenCard game={game} onOpen={openChickenShop} />}

      {canChooseTrack(game) && (
        <Card className="flex flex-col gap-3">
          <div>
            <p className="font-semibold">🛤️ 커리어 갈림길</p>
            <p className="text-sm text-gray-500">테크리드 다음은 어느 길로 갈까요? 한 번 고르면 바꿀 수 없어요.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => chooseTrack('manager')} className="rounded-2xl bg-white p-3 text-left active:bg-gray-100">
              <p className="font-semibold">👔 매니저</p>
              <p className="text-xs text-gray-500">EM → 디렉터 → VP → CTO</p>
            </button>
            <button type="button" onClick={() => chooseTrack('ic')} className="rounded-2xl bg-white p-3 text-left active:bg-gray-100">
              <p className="font-semibold">🛠️ 엔지니어</p>
              <p className="text-xs text-gray-500">스태프 → 프린시펄 → 펠로우</p>
            </button>
          </div>
        </Card>
      )}

      <OverworkCard game={game} />

      {!game.unemployed && <PromotionCard game={game} />}

      {visibleOffers.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-600">📨 받은 제안 {visibleOffers.length}건</p>
          {visibleOffers.map(({ offer: o, index: i }) => (
            <OfferCard key={o.company.name} offer={o} game={game} onAccept={() => acceptOffer(i)} onNegotiate={(percent) => negotiateOffer(i, percent)} />
          ))}
          {!game.unemployed && (
            <button type="button" onClick={declineOffers} className="py-2 text-sm text-gray-500">
              모두 거절하고 남기
            </button>
          )}
        </section>
      )}

      {postings.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <p className="text-sm font-medium text-gray-600">📋 채용 공고</p>
            <p className="text-xs text-gray-500">
              올해 지원 가능 <span className="font-semibold text-blue-500">{appsLeft}곳</span>
            </p>
          </div>
          {appsLeft > 0 && !game.unemployed && game.history.at(-1)?.focus !== 'job_hunt' && (
            <p className="text-xs text-gray-400">연초에 '이직 준비'를 고르면 3곳까지 지원할 수 있고 합격률도 올라가요.</p>
          )}
          {postings.map((p, i) => (
            <PostingCard
              key={p.company.name}
              posting={p}
              game={game}
              canApply={appsLeft > 0}
              onApply={() => apply(i)}
              hideResult={lastApplication?.posting.company.name === p.company.name}
            />
          ))}
        </section>
      )}

      {postings.length === 0 && visibleOffers.length === 0 && !game.unemployed && (
        <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-500">지금 확인할 채용 공고가 없어요. 재직 중에는 연봉이 오르거나 더 높은 직급인 공고를 찾아드려요.</p>
      )}

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-600">능력치</p>
        <StatBars stats={game.stats} />
      </Card>

      {/* 실직 중에도 은퇴는 할 수 있다 (40세 미만은 치킨집을 못 차려서 이게 유일한 출구) */}
      {(confirmRetire ? (
          <div className="flex flex-col gap-2">
            <p className="text-center text-sm text-gray-600">정말 은퇴할까요? 되돌릴 수 없어요.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmRetire(false)}>
                계속 일하기
              </Button>
              <Button variant="danger" onClick={retire}>
                은퇴하기
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmRetire(true)} className="py-2 text-sm text-gray-400">
            지금 은퇴하기
          </button>
        ))}

      {lastApplication && <ApplicationSheet result={lastApplication} onClose={dismissApplication} />}
    </Screen>
  )
}

/** 실직한 40대 이상: 재취업 대신 치킨집을 차리고 은퇴할 수 있다 */
function ChickenCard({ game, onOpen }: { game: GameState; onOpen: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const penalty = Math.round(agePenalty(game, 'resume') * 100)
  return (
    <Card className="flex flex-col gap-2 bg-amber-50">
      <p className="font-semibold text-amber-800">🍗 치킨집을 차릴까요?</p>
      <p className="text-sm text-amber-700">
        {game.age}세라 서류와 면접 통과가 {penalty}%p씩 어려워졌어요. 재취업 대신 모은 돈으로 치킨집을 차리고 개발자 인생을 마칠 수도 있어요.
        창업비 {formatSalary(CHICKEN.cost)}이 자산에서 빠지고, 장사가 잘될지는 운과 소통 실력에 달렸어요.
      </p>
      {confirm ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            조금 더 지원해 볼게요
          </Button>
          <Button onClick={onOpen}>치킨집 차리기</Button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="py-1 text-sm font-medium text-amber-700 underline">
          치킨집 창업하고 은퇴하기
        </button>
      )}
      {confirm && <p className="text-center text-xs text-amber-600">치킨집을 차리면 게임이 끝나요. 되돌릴 수 없어요.</p>}
    </Card>
  )
}

/** 쉬지 않고는 버티기 힘든 회사라면 옮길 때가 됐다는 신호 */
function OverworkCard({ game }: { game: GameState }) {
  const drain = overworkDrain(game)
  if (drain === null) return null
  const years = Math.max(1, Math.floor(game.stamina / -drain))
  return (
    <Card className="bg-orange-50">
      <p className="font-semibold text-orange-700">🔥 야근이 버거운 회사예요</p>
      <p className="text-sm text-orange-600">
        여기서는 공부만 해도 1년에 체력이 {-drain}씩 줄어요. 지금 체력이면 {years}년쯤 버틸 수 있고, 그 뒤엔 '쉬어가기'를 골라야 해서 승진이
        늦어져요. 야근 🔥가 적은 회사로 옮기는 것도 방법이에요.
      </p>
    </Card>
  )
}

/** 다음 직급으로 올라가려면 무엇이 필요한지 */
function PromotionCard({ game }: { game: GameState }) {
  const needsTrack = game.rank === 'lead' && game.preferredTrack === null
  const targets = needsTrack
    ? [nextPromotion(game, 'manager'), nextPromotion(game, 'ic')].filter((t): t is PromotionTarget => t !== null)
    : [nextPromotion(game)].filter((t): t is PromotionTarget => t !== null)

  if (targets.length === 0) {
    return (
      <Card>
        <p className="font-semibold">🏁 더 오를 직급이 없어요</p>
        <p className="text-sm text-gray-500">이제 명성은 평판과 업적으로 쌓여요.</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-600">🎯 다음 승진 조건</p>
      {targets.map((t) => (
        <PromotionRequirements key={t.rank.id} game={game} target={t} />
      ))}
      <p className="text-xs text-gray-400">
        조건을 다 채운 해에 고과가 B 이상이면 승진할 수 있어요. '쉬어가기'와 '이직 준비'를 고른 해에는 심사가 없어요.
      </p>
    </Card>
  )
}

function PromotionRequirements({ game, target }: { game: GameState; target: PromotionTarget }) {
  const rows = [
    { label: '경력', have: game.careerYear, need: target.minCareerYear, unit: '년차' },
    ...(Object.entries(target.rank.minStats) as [StatKey, number][]).map(([key, need]) => ({
      label: statLabels[key],
      have: game.stats[key],
      need,
      unit: '',
    })),
  ]
  const ready = rows.every((r) => r.have >= r.need)
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold">{target.rank.label}</p>
        {ready ? <Badge tone="green">조건 충족</Badge> : <Badge>준비 중</Badge>}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        {rows.map((r) => {
          const ok = r.have >= r.need
          return (
            <div key={r.label} className="flex items-center justify-between gap-2">
              <span className="text-gray-500">{r.label}</span>
              <span className={`tabular-nums ${ok ? 'text-emerald-600' : 'font-semibold text-red-500'}`}>
                {r.have}
                {r.unit} / {r.need}
                {r.unit} {ok ? '✓' : `(${r.need - r.have} 부족)`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SalaryDiff({ salary, current }: { salary: number; current: number }) {
  const pct = Math.round(((salary - current) / current) * 100)
  return (
    <div className="shrink-0 text-right">
      <p className="font-semibold tabular-nums">{formatSalary(salary)}</p>
      <p className={`text-xs ${pct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
        {pct >= 0 ? '+' : ''}
        {pct}%
      </p>
    </div>
  )
}

function CompanyLine({ company, rank }: { company: JobOffer['company']; rank: JobOffer['rank'] }) {
  const c = companyTypeById[company.type]
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">
        {c.emoji} {company.name}
      </p>
      <p className="text-xs text-gray-500">
        {c.label} · {industryById[company.industry].label} · {rankById[rank].label}
      </p>
    </div>
  )
}

function OfferCard({ offer, game, onAccept, onNegotiate }: {
  offer: JobOffer; game: GameState; onAccept: () => void; onNegotiate: (percent: NegotiationRaise) => void
}) {
  const c = companyTypeById[offer.company.type]
  const industryChange = offer.company.industry !== game.company.industry
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <CompanyLine company={offer.company} rank={offer.rank} />
        <SalaryDiff salary={offer.salary} current={game.salary} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={offer.source === 'headhunter' ? 'blue' : 'green'}>{offer.source === 'headhunter' ? '📞 헤드헌터' : '🎉 최종 합격'}</Badge>
        {offer.rank !== game.rank && <Badge tone="blue">⬆️ 직급 상승</Badge>}
        {offer.recruitmentPremium && <Badge tone="green">경력자 영입 프리미엄</Badge>}
        {c.stockOption && <Badge tone="green">스톡옵션</Badge>}
        <Badge>야근 {'🔥'.repeat(c.overtime)}</Badge>
        {industryChange && <Badge tone="amber">업종 변경 · 도메인 일부 리셋</Badge>}
        {game.flags.includes('mortgage') && offer.salary < game.salary && <Badge tone="red">대출 이자 주의</Badge>}
      </div>
      {offer.salary < game.salary && offer.rank !== game.rank && (
        <p className="text-xs text-amber-700">직급은 올라가지만 현금 연봉은 낮은 제안이에요. 협상 후 결정할 수 있어요.</p>
      )}
      <div className="rounded-xl bg-white p-3">
        {offer.negotiation ? (
          <p role="status" className={`text-sm ${offer.negotiation.accepted ? 'text-emerald-700' : 'text-gray-600'}`}>
            {offer.negotiation.accepted
              ? `협상 성공! ${formatSalary(offer.negotiation.originalSalary)} → ${formatSalary(offer.salary)}`
              : `${formatSalary(offer.negotiation.requestedSalary)} 요청은 거절됐어요. 기존 제안은 그대로 수락할 수 있어요.`}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold">연봉 협상</p>
            <p className="mb-2 text-xs text-gray-500">오퍼당 한 번 요청할 수 있어요. 큰 인상일수록 어렵고, 소통·평판과 회사 예산에 따라 결정돼요. 거절돼도 기존 제안은 유지돼요.</p>
            <div className="grid grid-cols-3 gap-2">
              {NEGOTIATION_RAISES.map((percent) => (
                <button key={percent} type="button" onClick={() => onNegotiate(percent)} className="rounded-xl bg-blue-50 px-1 py-3 text-blue-700 active:bg-blue-100">
                  <span className="block text-sm font-semibold">+{percent}% 요청</span>
                  <span className="text-xs">{formatSalary(Math.round(offer.salary * (1 + percent / 100)))}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <Button variant="secondary" onClick={onAccept}>
        이 회사로 이직하기
      </Button>
    </Card>
  )
}

/** 회사 문턱(hiringBar)을 별 1~5개로 */
function difficultyStars(posting: JobPosting): string {
  const bar = companyTypeById[posting.company.type].hiringBar
  const stars = Math.min(5, Math.max(1, Math.round(bar / 14)))
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

function PostingCard({
  posting,
  game,
  canApply,
  onApply,
  hideResult,
}: {
  posting: JobPosting
  game: GameState
  canApply: boolean
  onApply: () => void
  /** 결과 시트가 열려 있는 동안은 결과를 미리 보여주지 않는다 */
  hideResult?: boolean
}) {
  const resultBadge = hideResult ? (
    <Badge>전형 진행 중</Badge>
  ) : posting.result === 'passed' ? (
      <Badge tone="green">🎉 최종 합격</Badge>
    ) : posting.result ? (
      <Badge tone="red">{STAGE_LABELS[posting.result]} 탈락</Badge>
    ) : null

  return (
    <Card className={`flex flex-col gap-3 ${posting.applied ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <CompanyLine company={posting.company} rank={posting.rank} />
        <SalaryDiff salary={posting.salary} current={game.salary} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs tracking-tight text-amber-500" title="입사 난이도">
          {difficultyStars(posting)}
        </span>
        {posting.rank !== game.rank && <Badge tone="blue">⬆️ 승진 포지션</Badge>}
        {posting.recruitmentPremium && <Badge tone="green">경력자 영입 프리미엄</Badge>}
        {resultBadge}
      </div>
      {!posting.applied && (
        <Button variant="secondary" onClick={onApply} disabled={!canApply}>
          {canApply ? '지원하기' : '올해 지원 횟수를 다 썼어요'}
        </Button>
      )}
    </Card>
  )
}

/** 지원 결과를 단계별로 하나씩 보여준다 */
function ApplicationSheet({ result, onClose }: { result: ApplicationResult; onClose: () => void }) {
  const stagesShown = result.failedAt ? result.passed.length + 1 : HIRING_STAGES.length
  const [revealed, setRevealed] = useState(0)
  const done = revealed >= stagesShown

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setRevealed((r) => r + 1), 700)
    return () => clearTimeout(t)
  }, [revealed, done])

  const c = companyTypeById[result.posting.company.type]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p className="text-sm text-gray-500">지원 결과</p>
        <p className="mb-5 text-lg font-bold">
          {c.emoji} {result.posting.company.name}
        </p>

        <ol className="mb-6 flex flex-col gap-3">
          {/* 줄 수로 결과가 드러나지 않게 4단계를 모두 그린다 */}
          {HIRING_STAGES.map((stage, i) => {
            const visible = i < revealed
            const failed = stage === result.failedAt
            const skipped = i >= stagesShown
            return (
              <li key={stage} className={`flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 ${done && skipped ? 'opacity-40' : ''}`}>
                <span className="font-medium">{STAGE_LABELS[stage]}</span>
                {visible ? (
                  failed ? <Badge tone="red">불합격</Badge> : <Badge tone="green">합격</Badge>
                ) : done && skipped ? (
                  <span className="text-sm text-gray-400">—</span>
                ) : i === revealed ? (
                  <span className="animate-pulse text-sm text-gray-400">결과 대기 중…</span>
                ) : (
                  <span className="text-sm text-gray-300">대기</span>
                )}
              </li>
            )
          })}
        </ol>

        {done && (
          <p className="mb-4 text-center font-semibold">
            {result.failedAt ? `${STAGE_LABELS[result.failedAt]}에서 떨어졌어요.` : '🎉 최종 합격! 받은 제안에 추가됐어요.'}
          </p>
        )}
        <Button onClick={onClose} disabled={!done}>
          확인
        </Button>
      </div>
    </div>
  )
}
