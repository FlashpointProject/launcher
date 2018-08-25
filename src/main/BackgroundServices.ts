import * as path from 'path';
import { EventEmitter } from 'events';
import ManagedChildProcess from './ManagedChildProcess';

declare interface BackgroundServices {
  /**
   * Fires when any background service prints to std{out,err}. Every line is
   * prefixed with the name of the process and the output is guaranteed to end
   * with a new line.
   */
  on(event: 'output', handler: (output: string) => void): this;
}

class BackgroundServices extends EventEmitter {
  private router?: ManagedChildProcess;

  constructor(
    private flashpointPath: string,
  ) {
    super();
  };

  /**
   * Start all required background process for this platform
   */
  start() {
    switch (process.platform) {
      case 'linux':
        return this.startLinux();
      default:
        // @TODO: Add Windows support
    }
  }

  private startLinux() {
    const serverPath = path.join(this.flashpointPath, './Arcade/Games/Flash');

    // @TODO: Figure out if this is the same for the regular Flashpoint
    // This has only been tested with Flashpoint Infinity
    this.router = new ManagedChildProcess(
      'Redirector',
      'php',
      ['-S', 'localhost:22500', 'router.php'],
      serverPath,
    );

    // Send back the output of all individual child processes. These will be
    // displayed in the GUI. The child process will prefix everything with
    // `${this.name}:` so we don't have to worry about that here.
    this.router.on('output', output => this.emit('output', output));
  }

  /**
   * Stop all currently active background processes
   */
  stop() {
    if (this.router) {
      this.router.kill();
    }
  }
}

export default BackgroundServices;
