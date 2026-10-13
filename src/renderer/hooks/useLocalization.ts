import { LangContext } from '@renderer/util/lang';
import { LangContainer } from 'flashpoint-launcher';
import { useContext } from 'react';

export function useLocalization(): LangContainer {
  const strings = useContext(LangContext);
  return strings;
}
