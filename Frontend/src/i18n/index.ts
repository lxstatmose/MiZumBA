import en from './en'
import ru from './ru'

export type Lang = 'en' | 'ru'
export type { Translations } from './en'

const dicts = { en, ru }

export function getT(lang: Lang) {
  return dicts[lang]
}

export { en, ru }
