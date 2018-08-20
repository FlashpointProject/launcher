import * as path from 'path';
import ManagedChildProcess from './ManagedChildProcess';

export default class BackgroundServices {
	private router?: ManagedChildProcess;

	constructor(
		private flashpointPath: string,
	) {};

	/**
	 * Start all required background process for this platform
	 */
	start() {
		const serverPath = path.join(this.flashpointPath, './Arcade/Games/Flash');

		// @TODO: Figure out if this is the same for the regular Flashpoint
		// This has only been tested with Flashpoint Infinity
		this.router = new ManagedChildProcess(
			'Redirector',
			'php',
			['-S', 'localhost:22500', 'router.php'],
			serverPath,
		);
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
