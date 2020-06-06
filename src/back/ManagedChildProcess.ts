import { IBackProcessInfo, INamedBackProcessInfo, ProcessState } from '@shared/interfaces';
import { ILogPreEntry } from '@shared/Log/interface';
import { Coerce } from '@shared/utils/Coerce';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

const { str } = Coerce;

export interface ManagedChildProcess {
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

  public id: string;
  public info: INamedBackProcessInfo | IBackProcessInfo;
  /** Process that this is wrapping/managing. */
  private process?: ChildProcess;
  /** If the process is currently being restarted. */
  private _isRestarting: boolean = false;
  /** Display name of the service. */
  public readonly name: string;
  /** The current working directory of the process. */
  private cwd: string;
  /** If the process is detached (it is not spawned as a child process of this program). */
  private detached: boolean;
  /** If the process should be restarted if it exits unexpectedly. */
  private autoRestart: boolean;
  /** A timestamp of when the process was started. */
  private startTime: number = 0;
  /** State of the process. */
  private state: ProcessState = ProcessState.STOPPED;

  constructor(id: string, name: string, cwd: string, detached: boolean, autoRestart: boolean, info: INamedBackProcessInfo | IBackProcessInfo) {
    super();
    this.id = id;
    this.name = name;
    this.cwd = cwd;
    this.detached = detached;
    this.autoRestart = autoRestart;
    this.info = info;
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
      this.process = spawn(this.info.filename, this.info.arguments, { cwd: this.cwd, detached: this.detached });
      // Set start timestamp
      this.startTime = Date.now();
      // Log
      this.logContent(this.name + ' has been started');
      // Setup listeners
      if (this.process.stdout) {
        this.process.stdout.on('data', this.logContentAny);
      }
      if (this.process.stderr) {
        this.process.stderr.on('data', this.logContentAny);
      }
      // Update state
      this.setState(ProcessState.RUNNING);
      // Register child process listeners
      this.process.on('exit', (code, signal) => {
        if (code) { this.logContent(`${this.name} exited with code ${code}`);     }
        else      { this.logContent(`${this.name} exited with signal ${signal}`); }
        const wasRunning = (this.state === ProcessState.RUNNING);
        this.process = undefined;
        this.setState(ProcessState.STOPPED);
        if (this.autoRestart && wasRunning) {
          this.spawn();
        }
      })
      .on('error', error => {
        this.logContent(`${this.name} failed to start - ${error.message}`);
        this.setState(ProcessState.STOPPED);
        this.process = undefined;
      });
    }
  }

  /** Politely ask the child process to exit (if it is running). */
  public kill(): void {
    if (this.process) {
      this.setState(ProcessState.KILLING);
      this.process.kill();
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
    if (this.state !== state) {
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

  private logContentAny = (content: Buffer | any): void => {
    try {
      if (Buffer.isBuffer(content)) {
        this.logContent(content.toString());
      } else {
        this.logContent(str(content));
      }
    } catch (e) {
      console.warn(`ManagedChildProcess failed to log content: "${content}" (type: ${typeof content})`);
    }
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
