import * as React from 'react';
import { getDefaultLocalization } from '@shared/lang';

export const LangContext = React.createContext(getDefaultLocalization());
