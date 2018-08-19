import { spawn, ChildProcess } from "child_process";

export default class ManagedChildProcess {
  private process: ChildProcess;

  constructor(name: string, command: string, args: string[], cwd: string) {
    this.process = spawn('php', ['-S', 'localhost:22500', 'router.php'], {
			cwd,
    });
    
    this.process.stdout.on('data', (data) => {
			console.log(`${name}: ${data}`);
		});
		
		this.process.stderr.on('data', (data) => {
			console.error(`${name}: ${data}`);
		});
		
		this.process.on('close', (code) => {
			console.log(`${name} exited with code ${code}`);
		});
  }

  kill() {
    return this.process.kill();
  }
}