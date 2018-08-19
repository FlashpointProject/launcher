import * as path from 'path';
import ManagedChildProcess from './ManagedChildProcess';

export default class BackgroundServices {
	private router?: ManagedChildProcess;

	constructor(
		private flashpointPath: string,
	) {};

	start() {
		const serverPath = path.join(this.flashpointPath, './Arcade/Games/Flash');

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