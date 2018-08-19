import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { Main } from './Main';

export default class BackgroundServices {
	private router?: ChildProcess;

	constructor(
			private main: Main,
	) {};

	start() {
		const { flashpointPath } = this.main.config;
		const serverPath = path.join(flashpointPath, './Arcade/Games/Flash');
		this.router = spawn('php', ['-S', 'localhost:22500', 'router.php'], {
			cwd: serverPath,
		});

		this.router.stdout.on('data', (data) => {
			console.log(`stdout: ${data}`);
		});
		
		this.router.stderr.on('data', (data) => {
			console.log(`stderr: ${data}`);
		});
		
		this.router.on('close', (code) => {
			console.log(`child process exited with code ${code}`);
		});
	}

	stop() {
		if (this.router) {
			this.router.kill();
		}
	}
}