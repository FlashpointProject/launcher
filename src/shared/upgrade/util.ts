import { LangContainer } from 'flashpoint-launcher';

/**
 * Returns the localized string for an upgrade (Or the same string, if none is found)
 *
 * @param str String ID
 * @param lang Language container
 */
export function getUpgradeString(str: string, lang?: LangContainer['upgrades']) {
  return lang && lang[str] || str;
}
