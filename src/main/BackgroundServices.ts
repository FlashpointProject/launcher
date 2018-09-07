import * as path from 'path';
import { EventEmitter } from 'events';
import ManagedChildProcess from './ManagedChildProcess';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { isFlashpointValidCheck } from '../shared/checkSanity';

declare interface BackgroundServices {
  /**
   * Fires when any background service prints to std{out,err}. Every line is
   * prefixed with the name of the process and the output is guaranteed to end
   * with a new line.
   */
  on(event: 'output', handler: (output: string) => void): this;
}

class BackgroundServices extends EventEmitter {
  /** Local web-server that serves games */
  private router?: ManagedChildProcess;
  /* Program that redirects some out-going traffic to the local web-server (Windows only) */
  private redirector?: ManagedChildProcess;

  /**
   * Start all required background process for this platform
   */
  start(config: IAppConfigData) {
    switch (process.platform) {
      case 'linux':
        return this.startLinux(config);
      case 'win32':
        return this.startWindows(config);
      default:
        // @TODO: Add support for Mac?
    }
  }

  private startLinux(config: IAppConfigData) {
    const serverPath = path.join(config.flashpointPath, './Arcade/Games/Flash');

    // @TODO: Figure out if this is the same for the regular Flashpoint
    // This has only been tested with Flashpoint Infinity
    if (config.startRouter) {
      this.router = new ManagedChildProcess(
        'Router',
        'php',
        ['-S', 'localhost:22500', 'router.php'],
        serverPath,
      );

      // Send back the output of all individual child processes. These will be
      // displayed in the GUI. The child process will prefix everything with
      // `${this.name}:` so we don't have to worry about that here.
      this.router.on('output', output => this.emit('output', output));

      this.router.spawn();
    }
  }

  private async startWindows(config: IAppConfigData) {
    const logOutput = (output: string) => { this.emit('output', output); };

    // @TODO
    // Run before starting services: 'php.exe' ['-f', 'update_httpdconf_main_dir.php']
    // Run after closing services: 'php.exe' ['-f', 'reset_httpdconf_main_dir.php']

    // Abort if Flashpoint path is not valid
    const valid = await isFlashpointValidCheck(config.flashpointPath);
    if (!valid) { return; }

    // Start router
    if (config.startRouter) {
      this.router = new ManagedChildProcess(
        'Router',
        'php',
        ['-S', 'localhost:22500', 'router.php'],
        path.join(config.flashpointPath, './Arcade/Games/Flash'),
      );
      this.router.on('output', logOutput);
      this.router.spawn();
    }

    // Start redirector
    if (config.startRedirector) {
      if (config.useFiddler) {
        this.redirector = new ManagedChildProcess(
          'Redirector',
          'Fiddler2Portable.exe',
          ['-noversioncheck', '-quiet'],
          path.join(config.flashpointPath, './Arcade/Fiddler2Portable'),
        );
      } else {
        this.redirector = new ManagedChildProcess(
          'Redirector',
          'Redirect.exe',
          [],
          path.join(config.flashpointPath, './Arcade/Redirector'),
        );
      }
      this.redirector.on('output', logOutput);
      this.redirector.spawn();
    }
  }

  /**
   * Stop all currently active background processes
   */
  stop() {
    if (this.router) {
      this.router.kill();
    }
    if (this.redirector) {
      this.redirector.kill();
    }
  }
}

export default BackgroundServices;
