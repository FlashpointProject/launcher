import { Disposable } from '@back/util/lifecycle';
import { ILogEntry } from '@shared/Log/interface';
import { Theme } from '@shared/ThemeFile';
import { LogoSet } from '@shared/extensions/interfaces';

export type ExtensionData = {
  extId: string;
  enabled: boolean;
  subscriptions: Disposable;
  logs: ILogEntry[];
}

export type ExtensionLogFunc = (message: string) => void

export type ExtensionContext = {
  subscriptions: Disposable
}

export type ExtensionModule = {
  activate?: (context: ExtensionContext) => Promise<void>;
  deactivate?: () => void;
}

export type Registry = {
  commands: Map<string, Command>;
  logoSets: Map<string, LogoSet>;
  themes: Map<string, Theme>;
}

export interface ICommand {
  command: string;
  callback: (...any: any[]) => any;
}

export type Command = ICommand & Disposable;
