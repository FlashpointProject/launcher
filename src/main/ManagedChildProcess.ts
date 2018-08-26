import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

/**
 * A Child Process which automatically logs all output to the console
 */
export default class ManagedChildProcess extends EventEmitter {
  private process: ChildProcess;

  constructor(
    private name: string,
    command: string,
    args: string[],
    cwd: string
  ) {
    super();
    this.process = spawn(command, args, { cwd });

    this.process.stdout.on('data', (data: Buffer) => {
      // BUG: This is only shows after the user presses CTRL+C. It does not
      // show it any other circumstances.
      const output = data.toString('utf8');
      const namedOutput = this.addNameToOutput(output);
      this.emit('output', namedOutput);
      process.stdout.write(namedOutput);
    });

		this.process.stderr.on('data', (data: Buffer) => {
      const output = data.toString('utf8');
      const namedOutput = this.addNameToOutput(output);
      this.emit('output', namedOutput);
      process.stderr.write(namedOutput);
		});

		this.process.on('close', (code) => {
			console.log(`${this.name} exited with code ${code}`);
		});
  }

  /**
   * Politely ask the child process to exit
   */
  kill() {
    return this.process.kill();
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
