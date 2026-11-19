export * from './types'
export { createRng } from './rng'
export type { ResolvedEvent } from './events'
export { createGame, firstJobOptions, startingStats } from './setup'
export { startYear, currentEvent, remainingEvents, chooseEventOption, finishYear, acknowledgeYear, staminaChange, overworkDrain } from './year'
export { acceptOffer, declineOffers, chooseTrack, canChooseTrack, nextYear, retireNow } from './hub'
export { formatSalary, meetsStats, nextPromotion, type PromotionTarget } from './rules'
export {
  negotiateOffer,
  NEGOTIATION_RAISES,
  type NegotiationRaise,
  applyToPosting,
  canSpendGapYear,
  spendGapYear,
  canOpenChickenShop,
  chickenChances,
  openChickenShop,
  agePenalty,
  stagePassChance,
  HIRING_STAGES,
  STAGE_LABELS,
} from './jobs'
