import * as path from 'path';
import { Main } from './Main';
import ManagedChildProcess from './ManagedChildProcess';

export default class BackgroundServices {
	private router?: ManagedChildProcess;

	constructor(
			private main: Main,
	) {};

	start() {
		const { flashpointPath } = this.main.config;
		const serverPath = path.join(flashpointPath, './Arcade/Games/Flash');

		this.router = new ManagedChildProcess(
			'router',
			'php',
			['-S', 'localhost:22500', 'router.php'],
			serverPath,
		);
	}

	stop() {
		if (this.router) {
			this.router.kill();
		}
	}
}