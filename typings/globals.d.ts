import { IMainWindowExternal } from '../src/shared/interfaces';

/** Custom modifications made by this project */
declare global {
  interface Window {
    Shared: IMainWindowExternal;
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
