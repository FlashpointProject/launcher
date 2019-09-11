import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { ILogPreEntry } from '../shared/Log/interface';
import { ProcessState } from '../shared/service/interfaces';

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
  /** Fires whenever the status of a process changes */
  on(event: 'change', listener: (name: string) => void): this;
  emit(event: 'change', name: string): boolean;
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
  private startTime: number;
  private state: ProcessState;

  constructor(name: string, command: string, args: string[], cwd: string, detached: boolean) {
    super();
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.detached = detached;
    this.startTime = 0;
    this.state = ProcessState.STOPPED;
  }

  public get pid(): number {
    if (this.process) {
      return this.process.pid;
    } else {
      return -1;
    }
  }

  public getState(): ProcessState {
    return this.state;
  }

  public getStartTime(): number {
    return this.startTime;
  }

  /** Spawn process and keep track of its output */
  public spawn(): void {
    if (this.process) { throw Error('You must not spawn the same ManagedChildProcess multiple times.'); }
    this.process = spawn(this.command, this.args, { cwd: this.cwd, detached: this.detached });
    this.startTime = Date.now();
    this.logContent(this.name + ' has been started');
    // Add event listeners to process
    if (this.process.stdout) {
      this.process.stdout.on('data', this.logContent);
    }
    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer) => {
        this.logContent(data.toString('utf8'));
      });
    }
    this.process.on('exit', (code, signal) => {
      if (code) { this.logContent(`${this.name} exited with code ${code}`);     }
      else      { this.logContent(`${this.name} exited with signal ${signal}`); }
      this.process = undefined;
      this.setState(ProcessState.STOPPED);
    });
    this.setState(ProcessState.RUNNING);
  }

  /** Politely ask the child process to exit */
  public kill(): void {
    if (this.process) {
      this.setState(ProcessState.KILLING);
      this.process.kill();
    }
  }

  /** Restart the managed process (by creating a new one) */
  public restart(): void {
    this.logContent(`Restarting ${this.name} process`);
    if (this.process) {
      this.process.removeAllListeners();
      // Keep track of old process, but don't alert listeners on state change
      this.process.on('exit', (code, signal) => {
        if (code) { this.logContent(`Old ${this.name} exited with code ${code}`);     }
        else      { this.logContent(`Old ${this.name} exited with signal ${signal}`); }
      });
      this.kill();
      this.process = undefined;
    }
    this.spawn();
  }

  private setState(state: ProcessState): void {
    if (this.state != state) {
      this.state = state;
      this.emit('change', this.name);
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
