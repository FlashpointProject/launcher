import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as killAll from 'tree-kill';
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
  /** Fires whenever the status of a process changes. */
  on(event: 'change', listener: () => void): this;
  emit(event: 'change'): boolean;
}

/** Manages a single process. Wrapper around node's ChildProcess. */
export class ManagedChildProcess extends EventEmitter {
  /** Process that this is wrapping/managing. */
  private process?: ChildProcess;
  /** Display name of the service. */
  public readonly name: string;
  /** Command of the process (usually a filename of a program). */
  private command: string;
  /** Arguments passed to the process. */
  private args: string[];
  /** The current working directory of the process. */
  private cwd: string;
  /** If the process is detached (it is not spawned as a child process of this program). */
  private detached: boolean;
  /** A timestamp of when the process was started. */
  private startTime: number = 0;
  /** State of the process. */
  private state: ProcessState = ProcessState.STOPPED;

  constructor(name: string, command: string, args: string[], cwd: string, detached: boolean) {
    super();
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.detached = detached;
  }

  /** Get the process ID (or -1 if the process is not running). */
  public getPid(): number {
    return this.process ? this.process.pid : -1;
  }

  /** Get the state of the process. */
  public getState(): ProcessState {
    return this.state;
  }

  /** Get the time timestamp of when the process was started. */
  public getStartTime(): number {
    return this.startTime;
  }

  /** Spawn process and keep track on it. */
  public spawn(): void {
    // Spawn process
    if (this.process) { throw Error('You must not spawn the same ManagedChildProcess while it\'s running.'); }
    this.process = spawn(this.command, this.args, { cwd: this.cwd, detached: this.detached });
    // Check if spawn failed
    if (!this.process.pid) { // (No PID means that the spawn failed)
      this.process = undefined;
      this.setState(ProcessState.FAILED);
      return;
    }
    // Set start timestamp
    this.startTime = Date.now();
    // Log
    this.logContent(this.name + ' has been started');
    // Setup listeners
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
    // Update state
    this.setState(ProcessState.RUNNING);
  }

  /** Politely ask the child process to exit (if it is running). */
  public kill(): void {
    if (this.process) {
      this.setState(ProcessState.KILLING);
      killAll(this.process.pid);
    }
  }

  /** Restart the managed child process (by creating a new one). */
  public restart(): void {
    this.logContent(`Restarting ${this.name} process`);
    if (this.process) {
      this.process.removeAllListeners();
      // Keep track of old process, but don't alert listeners on state change
      this.process.on('exit', (code, signal) => {
        if (code) { this.logContent(`Old ${this.name} exited with code ${code}`);     }
        else      { this.logContent(`Old ${this.name} exited with signal ${signal}`); }
      });
      killAll(this.process.pid);
      this.process = undefined;
    }
    this.spawn();
  }

  /** Set the state of the process. */
  private setState(state: ProcessState): void {
    if (this.state != state) {
      this.state = state;
      this.emit('change');
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
