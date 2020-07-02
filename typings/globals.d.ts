import { IMainWindowExternal } from '../src/shared/interfaces';
import { RootLogger } from 'loglevel';

/** Custom modifications made by this project */
declare global {
  interface Window {
    Shared: IMainWindowExternal;
    log: RootLogger;
  }
  namespace NodeJS {
    interface Global {
      log: RootLogger;
    }
  }
}

declare const log: RootLogger;

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
