import { achievements, focuses, ranks } from './career'
import { companyTypes, industries } from './companies'
import { careerExits } from './exits'
import { educations, playStyles, specialties } from './profile'

export * from './balance'
export * from './career'
export * from './companies'
export * from './events'
export * from './exits'
export * from './feed'
export * from './profile'

function byId<T extends { id: string }>(list: T[]): Record<T['id'], T> {
  return Object.fromEntries(list.map((item) => [item.id, item])) as Record<T['id'], T>
}

export const educationById = byId(educations)
export const specialtyById = byId(specialties)
export const playStyleById = byId(playStyles)
export const companyTypeById = byId(companyTypes)
export const industryById = byId(industries)
export const rankById = byId(ranks)
export const focusById = byId(focuses)
export const achievementById = byId(achievements)
export const careerExitById = byId(careerExits)

export const statLabels = {
  coding: '코딩',
  design: '설계',
  communication: '소통',
  domain: '도메인',
  reputation: '평판',
} as const
