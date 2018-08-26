import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

/**
 * A Child Process which automatically logs all output to the console
 */
export default class ManagedChildProcess extends EventEmitter {
  private process?: ChildProcess;

  constructor(
    private name: string,
    private command: string,
    private args: string[],
    private cwd: string
  ) {
    super();
  }

  spawn() {
    if (this.process) {
      throw Error('Cannot spawn already spawned process');
    }

    this.process = spawn(this.command, this.args, { cwd: this.cwd });

    this.emit('output', `${this.name} has been started\n`);

    this.process.stdout.on('data', (data: Buffer) => {
      // BUG: This is only shows after the user presses CTRL+C. It does not
      // show it any other circumstances.
      const output = data.toString('utf8');
      const namedOutput = this.addNameToOutput(output);
      this.emit('output', namedOutput);
    });

    this.process.stderr.on('data', (data: Buffer) => {
      const output = data.toString('utf8');
      const namedOutput = this.addNameToOutput(output);
      this.emit('output', namedOutput);
    });

    this.process.on('exit', (code, signal) => {
      if (code) {
        this.emit('output', `${this.name} exited with code ${code}\n`);
      } else {
        this.emit('output', `${this.name} exited with signal ${signal}\n`);
      }

      this.process = undefined;
    });
  }

  /**
   * Politely ask the child process to exit
   */
  kill() {
    if (this.process) {
      this.process.kill();
    }
  }

  /**
   * Add `${this.name}:` before each line of the output
   *
   * @param output The std{out,err} of the process.
   */
  private addNameToOutput(output: string) {
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
