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
  // @TODO Add timeouts for restarting and killing the process (it should give up after some time, like 10 seconds) maybe?
  /** Process that this is wrapping/managing. */
  private process?: ChildProcess;
  /** If the process is currently being restarted. */
  private _isRestarting: boolean = false;
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
    if (!this.process && !this._isRestarting) {
      // Spawn process
      this.process = spawn(this.command, this.args, { cwd: this.cwd, detached: this.detached });
      // Check if spawn failed
      if (!this.process.pid) { // (No PID means that the spawn failed)
        this.logContent(`${this.name} failed to start`);
        this.process = undefined;
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
  }

  /** Politely ask the child process to exit (if it is running). */
  public kill(): void {
    if (this.process) {
      this.setState(ProcessState.KILLING);
      killAll(this.process.pid);
    }
  }

  /** Restart the managed child process (by killing the current, and spawning a new). */
  public restart(): void {
    if (this.process && !this._isRestarting) {
      this._isRestarting = true;
      this.logContent(`Restarting ${this.name} process`);
      // Replace all listeners with a single listener waiting for the process to exit
      this.process.removeAllListeners();
      this.process.once('exit', (code, signal) => {
        if (code) { this.logContent(`Old ${this.name} exited with code ${code}`);     }
        else      { this.logContent(`Old ${this.name} exited with signal ${signal}`); }
        this._isRestarting = false;
        this.spawn();
      });
      // Kill process
      this.kill();
      this.process = undefined;
    } else {
      this.spawn();
    }
  }

  /**
    * Set the state of the process.
   * @param state State to set.
   */
  private setState(state: ProcessState): void {
    if (this.state != state) {
      this.state = state;
      this.emit('change');
    }
  }

  /**
   * Add an entry in the log.
   * @param content Content of the entry.
   */
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
