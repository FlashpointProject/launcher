import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { IBackProcessInfo } from './background/interfaces';

/**
 * A Child Process which automatically logs all output to the console
 */
export default class ManagedChildProcess extends EventEmitter {
  private process?: ChildProcess;
  public readonly name: string;
  private command: string;
  private args: string[];
  private cwd: string;

  constructor(name: string, command: string, args: string[], cwd: string) {
    super();
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
  }

  /** Spawn process and keep track of its output */
  public spawn(): void {
    if (this.process) { throw Error('You must not spawn the same ManagedChildProcess multiple times.'); }
    this.process = spawn(this.command, this.args, { cwd: this.cwd });
    this.emit('output', `${this.name} has been started\n`);
    // Add event listeners to process
    this.process.stdout.on('data', (data: Buffer) => {
      // @BUG: This is only shows after the user presses CTRL+C.
      //       It does not show it any other circumstances.
      this.emit('output', this.addNameToOutput(data.toString('utf8')));
    });
    this.process.stderr.on('data', (data: Buffer) => {
      this.emit('output', this.addNameToOutput(data.toString('utf8')));
    });
    this.process.on('exit', (code, signal) => {
      if (code) { this.emit('output', `${this.name} exited with code ${code}\n`);     } 
      else      { this.emit('output', `${this.name} exited with signal ${signal}\n`); }
      this.process = undefined;
    });
  }

  /** Politely ask the child process to exit */
  public kill(): void {
    if (this.process) {
      this.process.kill();
    }
  }

  /**
   * Add `${this.name}:` before each line of the output
   * @param output The std{out,err} of the process.
   */
  private addNameToOutput(output: string): string {
    return (
      output
        .replace(/\n$/, '')
        .split('\n')
        .map(line => `${this.name}: ${line}`)
        .join('\n')
        + '\n'
    );
  }
}
