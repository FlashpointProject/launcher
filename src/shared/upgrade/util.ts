import { LangContainer } from '../lang';

/** Returns the localized string for an upgrade (Or the same string, if none is found) */
export function getUpgradeString(str: string, lang?: LangContainer['upgrades']) {
  return lang && lang[str] || str;
}