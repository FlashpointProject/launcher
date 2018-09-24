import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { promisify } from 'util';
import ManagedChildProcess from '../ManagedChildProcess';
import { IAppConfigData } from '../../shared/config/IAppConfigData';
import { isFlashpointValidCheck } from '../../shared/checkSanity';
import { BackgroundServicesFile } from './BackgroundServicesFile';
import { IBackProcessInfoFile, IBackProcessInfo } from './interfaces';

const execFile = promisify(child_process.execFile);

declare interface BackgroundServices {
  /**
   * Fires when any background service prints to std{out,err}. Every line is
   * prefixed with the name of the process and the output is guaranteed to end
   * with a new line.
   */
  on(event: 'output', handler: (output: string) => void): this;
  /** Fires when the this has executed all processes inside .start() */
  on(event: 'start-done'): this;
}

class BackgroundServices extends EventEmitter {
  private flashpointPath?: string;
  /** If the .start() method has been called and is done */
  private isStartDone: boolean = false;
  /** Information about how to run the background services */
  private serviceInfo?: IBackProcessInfoFile;
  /** Local web-server that serves games */
  private router?: ManagedChildProcess;
  /* Program that redirects some out-going traffic to the local web-server (Windows only) */
  private redirector?: ManagedChildProcess;

  /** Start all required background process for this platform */
  public async start(config: IAppConfigData): Promise<void> {
    const logOutput = (output: string) => { this.emit('output', output); };

    // Keep the flashpoint path
    this.flashpointPath = config.flashpointPath;

    // Abort if Flashpoint path is not valid
    const valid = await isFlashpointValidCheck(config.flashpointPath);
    if (!valid) {
      this.outputLine('The flashpoint root folder is invalid.');
      this.startDone();
      return;
    }

    // Load background service info from file
    let serviceInfo: IBackProcessInfoFile;
    try {
      serviceInfo = await BackgroundServicesFile.readFile(config.flashpointPath);
    } catch(error) {
      this.outputLine(`An error occurred while loading the background services file:\n  ${error.toString()}`);
      this.startDone();
      return;
    }
    //console.log('Services:', serviceInfo);
    this.serviceInfo = serviceInfo;

    //
    const start = serviceInfo.start;
    for (let i = 0; i < start.length; i++) {
      await this.execProcess(start[i]);
    }

    // Start router
    if (config.startRouter) {
      if (!serviceInfo.server) { throw new Error('Server process information not found.'); }
      this.router = createManagedChildProcess('Router', serviceInfo.server);
      this.router.on('output', logOutput);
      spawnProc(this.router);
    }

    // Start redirector
    // (Linux doesn't have to do this)
    if (config.startRedirector && process.platform !== 'linux') {
      const redirectorInfo = config.useFiddler ? serviceInfo.fiddler : serviceInfo.redirector;
      if (!redirectorInfo) { throw new Error(`Redirector process information not found. (Type: ${config.useFiddler?'Fiddler':'Redirector'})`); }
      this.redirector = createManagedChildProcess('Redirector', redirectorInfo);
      this.redirector.on('output', logOutput);
      spawnProc(this.redirector);
    }
    
    this.startDone();

    // -- Functions --
    // Wrapper for ManagedChildProcess's constructor
    function createManagedChildProcess(name: string, info: IBackProcessInfo): ManagedChildProcess {
      return new ManagedChildProcess(
        name, 
        info.filename, 
        info.arguments, 
        path.join(config.flashpointPath, info.path));
    }
    // Try to spawn a ManagedChildProcess, and log error if it fails
    function spawnProc(proc: ManagedChildProcess): void {
      try {
        proc.spawn();
      } catch(error) {
        logOutput(`An unexpected error occurred while trying to run the background process "${proc.name}".\n`+
                  `  ${error.toString()}\n`);
      }
    }
  }
  
  private startDone(): void {
    // Update start done flag and emit event
    this.isStartDone = true;
    this.emit('start-done');
  }

  /** Stop all currently active background processes */
  public async stop(): Promise<void> {
    if (!this.startDone) { throw new Error('You must not stop the background services befor they are done starting.'); }
    // Kill processes
    if (this.router) {
      this.router.kill();
    }
    if (this.redirector) {
      this.redirector.kill();
    }
    // Run stop commands
    if (this.serviceInfo) {
      const stop = this.serviceInfo.stop;
      for (let i = 0; i < stop.length; i++) {
        await this.execProcess(stop[i], true);
      }  
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
    this.outputLine(`Executing "${proc.filename}" [${proc.arguments.toString()}] in "${proc.path}"`);
    try {
      if (sync) { child_process.execFileSync(proc.filename, proc.arguments, { cwd: cwd }); }
      else      { await execFile(            proc.filename, proc.arguments, { cwd: cwd }); }
    } catch(error) {
      this.outputLine(`An unexpected error occurred while executing a command:\n  "${error}"`);
    }
  }

  private outputLine(text: string): void {
    this.emit('output', text+'\n');
  }
}

export default BackgroundServices;
