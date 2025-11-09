import { ExtensionContext, log } from 'flashpoint-launcher';

export async function activate(context: ExtensionContext): Promise<void> {
  log.info('Hello from the manager');
}
