import { IBackProcessInfo, INamedBackProcessInfo, ProcessState } from '@shared/interfaces';
import { ILogPreEntry } from '@shared/Log/interface';
import { Coerce } from '@shared/utils/Coerce';
import { ChildProcess, execFile, spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint-launcher';
import * as readline from 'readline';
import * as treeKill from 'tree-kill';
import { ApiEmitter } from './extensions/ApiEmitter';
import { Disposable } from './util/lifecycle';
import { readFileSync } from 'fs';

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
  on(event: 'change', listener: (newState: ProcessState) => void): this;
  emit(event: 'change', newState: ProcessState): boolean;
  /** Fires whenever the process exits */
  on(event: 'exit', listener: (code: number | null, signal: string | null) => void): this;
  emit(event: 'exit', code: number | null, signal: string | null): boolean;
}

export type ProcessOpts = {
  detached?: boolean;
  autoRestart?: boolean;
  shell?: boolean;
  cwd?: string;
  execFile?: boolean;
  env?: NodeJS.ProcessEnv;
}

/** Number of times to auto restart - maximum */
const MAX_RESTARTS = 5;

export const onServiceChange = new ApiEmitter<flashpoint.ServiceChange>();

/** Manages a single process. Wrapper around node's ChildProcess. */
export class ManagedChildProcess extends EventEmitter {
  // @TODO Add timeouts for restarting and killing the process (it should give up after some time, like 10 seconds) maybe?

  public id: string;
  public info: INamedBackProcessInfo | IBackProcessInfo;
  /** Process that this is wrapping/managing. */
  private process?: ChildProcess;
  /** If the process is currently being restarted. */
  private _isRestarting = false;
  /** Display name of the service. */
  public readonly name: string;
  /** The current working directory of the process. */
  private cwd: string;
  /** If the process is detached (it is not spawned as a child process of this program). */
  private detached: boolean;
  /** If the process should be restarted if it exits unexpectedly. */
  private autoRestart: boolean;
  /** Number of times the process has auto restarted. Used to prevent infinite loops. */
  private autoRestartCount: number;
  /** Whether to run in a shell */
  private shell: boolean;
  /** Whether to use execFile instead of spawn */
  private execFile: boolean;
  /** Launch with these Environmental Variables */
  private env?: NodeJS.ProcessEnv;
  /** A timestamp of when the process was started. */
  private startTime = 0;
  /** State of the process. */
  private state: ProcessState = ProcessState.STOPPED;

  constructor(id: string, name: string, cwd: string, opts: ProcessOpts, info: INamedBackProcessInfo | IBackProcessInfo) {
    super();
    const { detached, autoRestart, shell, execFile, env } = opts;
    this.id = id;
    this.name = name;
    this.cwd = cwd;
    this.detached = !!detached;
    this.autoRestart = !!autoRestart;
    this.autoRestartCount = 0;
    this.info = info;
    this.shell = !!shell;
    this.execFile = !!execFile;
    this.env = env;
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
  public spawn(auto?: boolean): void {
    if (!this.process && !this._isRestarting) {
      // Reset the auto restart counter when we've manually / deliberately spawned the process
      if (!auto) {
        this.autoRestartCount = 0;
      }
      // Spawn process
      if (this.execFile) {
        this.process = execFile(this.info.filename, this.info.arguments, { cwd: this.cwd, env: this.env });
      } else {
        if (process.platform == 'darwin') {
          if (this.env === undefined) {
            this.env = {PATH: ""};
          } else if (this.env.PATH === undefined) {
            this.env.PATH = "";
          }
          // @ts-ignore This won't be undefined, despite what tsc says.
          let pathArr: string[] = this.env.PATH.split(':');
          // HACK: manually read in /etc/paths to PATH. Needs to be done on Mac, because otherwise
          // the brew path won't be found.
          for (const entry of readFileSync('/etc/paths').toString().split('\n')) {
            if (entry != '' && !pathArr.includes(entry)) {
              pathArr.push(entry);
            }
          }
          // @ts-ignore This won't be undefined, despite what tsc says.
          this.env.PATH = pathArr.join(':');
          this.process = exec(this.info.filename + ' ' + this.info.arguments, { cwd: this.cwd, env: this.env});
        } else {
          this.process = spawn(this.info.filename, this.info.arguments, { cwd: this.cwd, detached: this.detached, shell: this.shell , env: this.env});
        }
      }
      // Set start timestamp
      this.startTime = Date.now();
      // Log
      this.logContent(this.name + ' has been started');
      // Setup listeners
      if (this.process.stdout) {
        const stdout = readline.createInterface({ input: this.process.stdout });
        stdout.on('line', this.logContentAny);
      }
      if (this.process.stderr) {
        const stderr = readline.createInterface({ input: this.process.stderr });
        stderr.on('line', this.logContentAny);
      }
      // Update state
      this.setState(ProcessState.RUNNING);
      // Register child process listeners
      this.process.on('exit', (code, signal) => {
        if (code) { this.logContent(`${this.name} exited with code ${code}`);     }
        else      { this.logContent(`${this.name} exited with signal ${signal}`); }
        const wasRunning = (this.state === ProcessState.RUNNING);
        this.process = undefined;
        this.emit('exit', code, signal);
        this.setState(ProcessState.STOPPED);
        if (this.autoRestart && wasRunning && code) {
          if (this.autoRestartCount < MAX_RESTARTS) {
            this.autoRestartCount++;
            this.spawn(true);
          } else {
            this.logContent(`${this.name} Service crashed too frequently, leaving stopped.`);
          }
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
      treeKill(this.process.pid);
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
      treeKill(this.process.pid);
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
      const oldState = this.state;
      this.state = state;
      this.emit('change', state);
      onServiceChange.fire({ process: this, oldState, newState: state });
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

export class DisposableChildProcess extends ManagedChildProcess implements Disposable {
  public toDispose: Disposable[];
  public isDisposed: boolean;
  public onDispose?: () => void;

  constructor(id: string, name: string, cwd: string, opts: ProcessOpts, info: INamedBackProcessInfo) {
    super(id, name, cwd, opts, info);
    this.toDispose = [];
    this.isDisposed = false;
  }
}
