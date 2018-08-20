import { spawn, ChildProcess } from "child_process";

/**
 * A Child Process which automatically logs all output to the console
 */
export default class ManagedChildProcess {
  private process: ChildProcess;

  constructor(
    private name: string,
    command: string,
    args: string[],
    cwd: string
  ) {
    this.process = spawn(command, args, { cwd });

    // @TODO: Make this output visible to the user

    this.process.stdout.on('data', (data: Buffer) => {
      // BUG: This is only shows after the user presses CTRL+C. It does not
      // show it any other circumstances.
      const output = data.toString('utf8');
      console.log(this.addNameToOutput(output));
    });

		this.process.stderr.on('data', (data: Buffer) => {
      const output = data.toString('utf8');
      console.error(this.addNameToOutput(output));
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
    );
  }
}
