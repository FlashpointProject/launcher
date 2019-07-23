import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { ILogPreEntry } from '../shared/Log/interface';

export declare interface ManagedChildProcess {
  /**
   * Fires when any background service prints to std{out,err}. Every line is
   * prefixed with the name of the process and the output is guaranteed to end
   * with a new line.
   */
  on(event: 'output', handler: (output: ILogPreEntry) => void): this;
  emit(event: 'output', output: ILogPreEntry): boolean;
  /** Fires when the this has executed all processes inside .start() */
  on(event: 'start-done'): this;
  emit(event: 'start-done'): boolean;
}

/**
 * A Child Process which automatically logs all output to the console
 */
export class ManagedChildProcess extends EventEmitter {
  private process?: ChildProcess;
  public readonly name: string;
  private command: string;
  private args: string[];
  private cwd: string;
  private detached: boolean;

  constructor(name: string, command: string, args: string[], cwd: string, detached: boolean) {
    super();
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.detached = detached;
  }

  /** Spawn process and keep track of its output */
  public spawn(): void {
    if (this.process) { throw Error('You must not spawn the same ManagedChildProcess multiple times.'); }
    this.process = spawn(this.command, this.args, { cwd: this.cwd, detached: this.detached });
    this.logContent('has been started');
    // Add event listeners to process
    this.process.stdout.on('data', (data: Buffer) => {
      // @BUG: This is only shows after the user presses CTRL+C.
      //       It does not show it any other circumstances.
      this.logContent(data.toString('utf8'));
    });
    this.process.stderr.on('data', (data: Buffer) => {
      this.logContent(data.toString('utf8'));
    });
    this.process.on('exit', (code, signal) => {
      if (code) { this.logContent(`exited with code ${code}`);     }
      else      { this.logContent(`exited with signal ${signal}`); }
      this.process = undefined;
    });
  }

  /** Politely ask the child process to exit */
  public kill(): void {
    if (this.process) {
      this.process.kill();
    }
  }

  private logContent(content: string): void {
    this.emit('output', {
      source: this.name,
      content: removeTrailingNewlines(content),
    });
  }
}

/** Remove all newlines at the end of a string */
function removeTrailingNewlines(str: string): string {
  let newString = str;
  while (newString.endsWith('\n')) {
    newString = newString.substr(0, newString.length - 1);
  }
  return newString;
}
