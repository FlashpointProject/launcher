import * as flashpoint from 'flashpoint-launcher';
import * as path from 'path';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { ControllerSet, ControllerStick, ControllerTrigger, readableInputs } from './shared';
import { isArray } from 'lodash';

const options = {
  ignoreAttributes: false,
  attributeNamePrefix: 'uq_',
};

export async function activate(context: flashpoint.ExtensionContext): Promise<void> {
  const configPath = path.join(flashpoint.config.flashpointPath, 'Data', 'Controller Configs');
  const defaultConfigPath = path.join(flashpoint.extensionPath, 'default.gamecontroller.amgp');
  await fs.promises.mkdir(configPath, { recursive: true });

  const microxPath = path.join(flashpoint.extensionPath, 'AntiMicroX', 'bin');
  let process: flashpoint.DisposableChildProcess | null = null;
  let lastGameId = '';

  const killProc = async () => {
    // New game launching, make sure old controller profile is dead
    if (process) {
      process.kill();
      flashpoint.dispose(process);
      process = null;
      // Make sure it's closed before starting the next
      return new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  flashpoint.games.onDidLaunchGame(async (game) => {
    // New game launching, make sure old controller profile is dead
    await killProc();

    // Check if config file exists
    const configFilePath = path.join(configPath, `${game.id}.gamecontroller.amgp`);

    if (fs.existsSync(configFilePath)) {
      lastGameId = game.id;
      flashpoint.log.info(`Found controller support for ${game.title}, launching AntiMicroX...`);
      // Load controller as service
      process = flashpoint.services.createProcess('controller-support', {
        path: '',
        filename: 'antimicrox.exe',
        arguments: ['--hidden', '--tray', '--profile', configFilePath]
      }, { noshell: true }, microxPath);
      process.spawn();
    }
  });

  flashpoint.services.onServiceRemove(async (dyingProc) => {
    if (dyingProc.id.startsWith('game.') && dyingProc.id.length > 5) {
      const gameId = dyingProc.id.substring(5);
      if (gameId === lastGameId) {
        if (process) {
          await killProc();
        }
      }
    }
  });

  flashpoint.games.onInterceptGetGame((game) => {
    if (game.extData === undefined) {
      game.extData = {};
    }

    const configFilePath = path.join(configPath, `${game.id}.gamecontroller.amgp`);

    game.extData!.controller = {
      config: readConfigFile(configFilePath)
    };
  });

  flashpoint.commands.registerCommand('core-controller.edit-config', async (game: flashpoint.Game) => {
    await killProc();

    const configFilePath = path.join(configPath, `${game.id}.gamecontroller.amgp`);

    flashpoint.log.info(`Editing controller support for ${game.title}, launching AntiMicroX...`);

    if (!fs.existsSync(configFilePath)) {
      const res = await flashpoint.dialogs.showMessageBox({
        largeMessage: true,
        message: 'No config found. Create a new one?',
        buttons: ['Ok', 'Cancel'],
        cancelId: 1
      });

      if (res === 1) {
        return;
      }

      fs.copyFileSync(defaultConfigPath, configFilePath);
    }

    // Load controller as service
    process = flashpoint.services.createProcess('controller-support', {
      path: '',
      filename: 'antimicrox.exe',
      arguments: ['--profile', configFilePath]
    }, { noshell: true }, microxPath);
    process.spawn();
  });
}

export function readConfigFile(filePath: string): ControllerSet {
  const controllerSet: ControllerSet = {
    stick: [],
    trigger: [],
    dpad: {
      dpadbutton: [],
      uq_index: 0
    },
    button: []
  };
  const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
  const parser = new XMLParser(options);
  const jsonObj = parser.parse(data);

  const set: ControllerSet = jsonObj.gamecontroller.sets.set;
  const names: SetNames | undefined = jsonObj.gamecontroller.names;

  if (set.stick) {
    for (const stick of set.stick) {
      const newStick: ControllerStick = {
        name: readableInputs.stick[stick.uq_index],
        stickbutton: [],
        uq_index: stick.uq_index
      };
      for (const button of stick.stickbutton) {
        newStick.stickbutton.push({
          name: readableInputs.stickbutton[button.uq_index],
          actionName: getActionName(names, 'stick', stick.uq_index, button.uq_index),
          slots: button.slots,
          uq_index: button.uq_index,
        });
      }
      controllerSet.stick!.push(newStick);
    }
  }

  if (set.trigger) {
    for (const trigger of set.trigger) {
      const newTrigger: ControllerTrigger = {
        name: readableInputs.trigger[trigger.uq_index],
        triggerbutton: {
          name: readableInputs.triggerbutton[trigger.triggerbutton.uq_index],
          actionName: getActionName(names, 'axis', trigger.uq_index),
          slots: trigger.triggerbutton.slots,
          uq_index: trigger.triggerbutton.uq_index
        },
        uq_index: trigger.uq_index
      };
      controllerSet.trigger!.push(newTrigger);
    }
  }

  if (set.dpad) {
    for (const button of set.dpad.dpadbutton) {
      controllerSet.dpad!.dpadbutton.push({
        name: readableInputs.dpadbutton[button.uq_index],
        actionName: getActionName(names, 'dpad', 1, button.uq_index),
        slots: button.slots,
        uq_index: button.uq_index
      });
    }
  }

  if (set.button) {
    for (const button of set.button) {
      controllerSet.button!.push({
        name: readableInputs.button[button.uq_index],
        actionName: getActionName(names, 'button', button.uq_index),
        slots: button.slots,
        uq_index: button.uq_index
      });
    }
  }

  return controllerSet;
}

function getActionName(setNames: SetNames | undefined, type: 'button' | 'dpad' | 'stick' | 'axis', uq_index: number, uq_button?: number): string | undefined {
  if (setNames === undefined) {
    return undefined;
  }

  switch (type) {
    case 'dpad':     {
      if (setNames.vdpadbutton === undefined) {
        return undefined;
      }
      const button = ConvertArray(setNames.vdpadbutton).find(s => s.uq_index === s.uq_index && s.uq_button === uq_button);
      return button?.['#text'];
    }
    case 'button':
    {
      if (setNames.buttonname === undefined) {
        return undefined;
      }
      const button = ConvertArray(setNames.buttonname).find(s => s.uq_index === uq_index);
      return button?.['#text'];
    }
    case 'stick':
    {
      if (setNames.controlstickbuttonname === undefined) {
        return undefined;
      }
      const button = ConvertArray(setNames.controlstickbuttonname).find(s => s.uq_index === uq_index && s.uq_button === uq_button);
      return button?.['#text'];
    }
    case 'axis': {
      if (setNames.axisname === undefined) {
        return undefined;
      }
      const button = ConvertArray(setNames.axisname).find(s => s.uq_index === uq_index);
      return button?.['#text'];
    }
    default: {
      return undefined;
    }
  }
}

function ConvertArray<T>(input: T | T[]): T[] {
  if (!isArray(input)) {
    return [input];
  }
  return input;
}

type SetNames = {
  buttonname?: ButtonName | ButtonName[];
  controlstickbuttonname?: ButtonName | ButtonName[];
  axisname?: ButtonName | ButtonName[];
  vdpadbutton?: ButtonName | ButtonName[];
};

type ButtonName = {
  '#text': string,
  uq_index: number,
  uq_button: number,
};
