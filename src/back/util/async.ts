/**
 * No modifications, licensed from Visual Studio Code under the MIT license. See /licenses/vscode
 * A barrier that is initially closed and then becomes opened permanently.
 */
export class Barrier {

  private _isOpen: boolean;
  private _promise: Promise<boolean>;
  private _completePromise!: (v: boolean) => void;

  constructor() {
    this._isOpen = false;
    this._promise = new Promise<boolean>((c, e) => {
      this._completePromise = c;
    });
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this._completePromise(true);
  }

  wait(): Promise<boolean> {
    return this._promise;
  }
}
