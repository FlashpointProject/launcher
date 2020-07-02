import { IMainWindowExternal } from '../src/shared/interfaces';

/** Custom modifications made by this project */
type LogFuncs = {
  trace: (source: string, message: string) => void;
  debug: (source: string, message: string) => void;
  info:  (source: string, message: string) => void;
  warn:  (source: string, message: string) => void;
  error: (source: string, message: string) => void;
}

declare global {
  interface Window {
    Shared: IMainWindowExternal;
    log: LogFuncs;
  }
  namespace NodeJS {
    interface Global {
      log: LogFuncs;
    }
  }
}

/** Add missing declarations ("polyfill" type information) */
declare global {
  interface Clipboard {
    writeText(newClipText: string): Promise<void>;
    // Add any other methods you need here.
  }
  interface NavigatorClipboard {
    // Only available in a secure context.
    readonly clipboard?: Clipboard;
  }
  interface Navigator extends NavigatorClipboard {}
}
