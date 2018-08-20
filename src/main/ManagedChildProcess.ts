import { spawn, ChildProcess } from "child_process";

export default class ManagedChildProcess {
  private process: ChildProcess;

  constructor(name: string, command: string, args: string[], cwd: string) {
    this.process = spawn(command, args, { cwd });

    this.process.stdout.on('data', (data) => {
			process.stdout.write(`${name}: ${data}`);
		});

		this.process.stderr.on('data', (data) => {
			process.stderr.write(`${name}: ${data}`);
		});

		this.process.on('close', (code) => {
			console.log(`${name} exited with code ${code}`);
		});
  }

  kill() {
    return this.process.kill();
  }
}
