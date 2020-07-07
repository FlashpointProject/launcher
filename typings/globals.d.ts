import { LogFunc, IMainWindowExternal } from '../src/shared/interfaces';

/** Custom modifications made by this project */
type LogFuncs = {
  trace: LogFunc;
  debug: LogFunc;
  info:  LogFunc;
  warn:  LogFunc;
  error: LogFunc;
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
  let log: LogFuncs;
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
