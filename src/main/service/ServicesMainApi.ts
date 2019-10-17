import * as child_process from 'child_process';
import { ipcMain, IpcMainEvent } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import { promisify } from 'util';
import { isFlashpointValidCheck } from '../../shared/checkSanity';
import { IAppConfigData } from '../../shared/config/interfaces';
import { ILogPreEntry } from '../../shared/Log/interface';
import { IBackProcessInfo, IService, IServiceAction, ProcessAction } from '../../shared/service/interfaces';
import { BackgroundServicesIPC } from '../../shared/service/ServicesApi';
import { stringifyArray } from '../../shared/Util';
import { ManagedChildProcess } from '../ManagedChildProcess';
import { ServiceFileData } from './interfaces';
import { ServicesFile } from './ServicesFile';

const execFile = promisify(child_process.execFile);
type SendFunc = (channel: string , ...rest: any[]) => boolean;

// Identifiers of the processes
// (this should probably be replaced with an associative array if the number of processes increases)
const serverID = 'server';
const redirectorID = 'redirector';

export declare interface ServicesMainApi {
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
  on(event: 'change', listener: (data: IService[]) => void): this;
  emit(event: 'change', data: IService[]): this;
}

/**
 * "Back end" part of the API for managing background services.
 * This manages the processes, exposes the API methods and data to the main process
 * and communicates with the API on the renderer process through IPC.
 */
export class ServicesMainApi extends EventEmitter {
  private flashpointPath?: string;
  private useFiddler?: boolean;
  /** If the .start() method has been called and is done */
  private isStartDone: boolean = false;
  /** Information about how to run the background services (loaded from the services.json file) */
  private serviceInfo?: ServiceFileData;
  /** Local web-server that serves games (this is the Router for Flashpoint Infinity) */
  private server?: ManagedChildProcess;
  /** Program that redirects some out-going traffic to the local web-server (Windows only) */
  private redirector?: ManagedChildProcess;
  /** Current copy of background data info */
  private _data?: IService[];
  /** Function that sends a message to the renderer via IPC */
  private sendToRenderer: SendFunc;

  constructor(sendToRenderer: SendFunc) {
    super();
    this.sendToRenderer = sendToRenderer;
    ipcMain
    .on(BackgroundServicesIPC.REQUEST_SYNC, this.onRequestSync.bind(this))
    .on(BackgroundServicesIPC.ACTION,       this.onAction.bind(this));
  }

  /** Start all required background process for this platform */
  public async start(config: IAppConfigData): Promise<void> {
    const logOutput = (entry: ILogPreEntry) => { this.log(entry); };

    // Keep some configs
    this.flashpointPath = config.flashpointPath;
    this.useFiddler = config.useFiddler;

    // Abort if Flashpoint path is not valid
    const valid = await isFlashpointValidCheck(config.flashpointPath);
    if (!valid) {
      this.logContent('The flashpoint root folder is invalid.');
      this.startDone();
      return;
    }

    // Load background service info from file
    let serviceInfo: ServiceFileData;
    try {
      const jsonFolder = path.posix.join(config.flashpointPath, config.jsonFolderPath);
      serviceInfo = await ServicesFile.readFile(jsonFolder, error => this.logContent(error));
    } catch (error) {
      this.logContent(`An error occurred while loading the background services file:\n  ${error.toString()}`);
      this.startDone();
      return;
    }
    this.serviceInfo = serviceInfo;

    // Run start commands
    const start = serviceInfo.start;
    for (let i = 0; i < start.length; i++) {
      await this.execProcess(start[i]);
    }

    // Start router
    if (config.startServer) {
      if (!serviceInfo.server) { throw new Error('Server process information not found.'); }
      this.server = createManagedChildProcess('Router', serviceInfo.server);
      this.server.on('output', logOutput);
      this.server.on('change', this.onChange.bind(this, serverID, this.server));
      this.spawnProc(this.server);
    }

    // Start redirector
    // (Linux doesn't have to do this)
    if (config.startRedirector && process.platform !== 'linux') {
      const redirectorInfo = config.useFiddler ? serviceInfo.fiddler : serviceInfo.redirector;
      if (!redirectorInfo) { throw new Error(`Redirector process information not found. (Type: ${config.useFiddler?'Fiddler':'Redirector'})`); }
      this.redirector = createManagedChildProcess('Redirector', redirectorInfo, config.useFiddler);
      this.redirector.on('output', logOutput);
      this.redirector.on('change', this.onChange.bind(this, redirectorID, this.redirector));
      this.spawnProc(this.redirector);
    }

    this.startDone();

    // -- Functions --
    // Wrapper for ManagedChildProcess's constructor
    function createManagedChildProcess(name: string, info: IBackProcessInfo, detached?: boolean): ManagedChildProcess {
      return new ManagedChildProcess(
        name,
        info.filename,
        info.arguments,
        path.join(config.flashpointPath, info.path),
        !!detached
      );
    }
  }

  private startDone(): void {
    // Update start done flag and emit event
    this.isStartDone = true;
    this.emit('start-done');
  }

  /** Stop all currently active background processes */
  public async stopAll(): Promise<void> {
    if (!this.startDone) { throw new Error('You must not stop the background services before they are done starting.'); }
    if (!this.serviceInfo) { return; }
    // Kill processes
    if (this.server) {
      if (this.serviceInfo.server && this.serviceInfo.server.kill) {
        this.server.kill();
      }
    }
    if (this.redirector) {
      const doKill: boolean = !!(
        this.useFiddler
          ? this.serviceInfo.fiddler    && this.serviceInfo.fiddler.kill
          : this.serviceInfo.redirector && this.serviceInfo.redirector.kill
      );
      if (doKill) { this.redirector.kill(); }
    }
    // Run stop commands
    const stop = this.serviceInfo.stop;
    for (let i = 0; i < stop.length; i++) {
      await this.execProcess(stop[i], true);
    }
  }

  /** Wait until this is done starting (doesn't wait if already done starting) */
  public async waitUntilDoneStarting(): Promise<void> {
    // Check if already done starting
    if (this.isStartDone) { return; }
    // Wait for the start done event
    await new Promise((resolve) => {
      this.once('start-done', () => { resolve(); });
    });
  }

  /** Execute a process and wait for it to finish */
  private async execProcess(proc: IBackProcessInfo, sync?: boolean): Promise<void> {
    if (this.flashpointPath === undefined) { throw new Error('BackgroundServices#flashpointPath must not be undefined when executing a process'); }
    const cwd: string = path.join(this.flashpointPath, proc.path);
    this.logContent(`Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`);
    try {
      if (sync) { child_process.execFileSync(proc.filename, proc.arguments, { cwd: cwd }); }
      else      { await execFile(            proc.filename, proc.arguments, { cwd: cwd }); }
    } catch (error) {
      this.logContent(`An unexpected error occurred while executing a command:\n  "${error}"`);
    }
  }

  /** Try to spawn a ManagedChildProcess, and log error if it fails */
  private spawnProc(proc: ManagedChildProcess): void {
    try {
      proc.spawn();
    } catch (error) {
      this.logContent(
        `An unexpected error occurred while trying to run the background process "${proc.name}".`+
        `  ${error.toString()}`
      );
    }
  }

  /**
   * Send an update to the Service API in the renderer.
   * @param data Data to send.
   */
  private sendUpdate(data: Partial<IService>): boolean {
    return this.sendToRenderer(BackgroundServicesIPC.UPDATE, [data]);
  }

  private onChange(identifier: string, proc: ManagedChildProcess): void {
    const data: IService = {
      identifier,
      name: proc.name,
      state: proc.getState(),
      pid: proc.getPid(),
      startTime: proc.getStartTime(),
    };
    this.sendToRenderer(BackgroundServicesIPC.UPDATE, [data]);
  }

  /**
  * Called when the background services data is requested from the renderer API.
  * This sends the full background services data to the renderer.
  */
  private onRequestSync(event: IpcMainEvent): void {
    const services: IService[] = [];
    if (this.serviceInfo && this.serviceInfo.server) {
      if (this.server) {
        services.push({
          identifier: serverID,
          name: this.server.name,
          state: this.server.getState(),
          pid : this.server.getPid(),
          startTime: this.server.getStartTime(),
          info: this.serviceInfo.server,
        });
      }
      if (this.redirector && this.serviceInfo.redirector) {
        services.push({
          identifier: redirectorID,
          name: this.redirector.name,
          state: this.redirector.getState(),
          pid : this.redirector.getPid(),
          startTime: this.redirector.getStartTime(),
          info: this.serviceInfo.redirector,
        });
      }
    }
    event.returnValue = services;
  }

  /** Perform a process action on a specific process. */
  private onAction = (event: IpcMainEvent, data: IServiceAction) => {
    if (data.identifier === serverID) {
      if (this.server) { performProcessAction(this.server, data.action); }
    } else if (data.identifier === redirectorID) {
      if (this.redirector) { performProcessAction(this.redirector, data.action); }
    }
  }

  private log(entry: ILogPreEntry): void {
    this.emit('output', entry);
  }

  private logContent(content: string): void {
    this.emit('output', {
      source: 'Background Services',
      content,
    });
  }
}

/**
 * Perform a process action on a process.
 * @param proc Process to perform action on.
 * @param action Action to perform on process.
 */
function performProcessAction(proc: ManagedChildProcess, action: ProcessAction): void {
  switch (action) {
    case ProcessAction.START:
      proc.spawn();
      break;
    case ProcessAction.STOP:
      proc.kill();
      break;
    case ProcessAction.RESTART:
      proc.restart();
      break;
    default:
      console.warn('Unhandled Process Action');
  }
}
