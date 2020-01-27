import { remote } from 'electron';
import * as path from 'path';
import * as React from 'react';
import * as AppConstants from '@shared/constants';
import * as fs from 'fs-extra';
import { BackIn, GetLanguageData, UpdateConfigData } from '../../../shared/back/types';
import { createLangContainer } from '../../../shared/lang';
import { UpgradeStage } from '../../../shared/upgrade/types';
import { deepCopy, canReadWrite } from '../../../shared/Util';
import { isFlashpointValidCheck } from '../../Util';
import { TitleBar } from '../TitleBar';
import { UpgradeStageState } from '../../../shared/interfaces';
import { downloadAndInstallUpgrade } from '../../../shared/utils/upgrade';
import { noop } from '@babel/types';

type SetupPageProps = {
  /** Data and state for the setup upgrade */
  upgrade: UpgradeStage;
};

export function SetupPage(props: SetupPageProps) {
  const [installPath, setInstallPath] = React.useState('');
  const [installPathValid, setInstallPathValid] = React.useState(false);
  const [existingInstall, setExistingInstall] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);
  const [askBeforeClosing, setAskBeforeClosing] = React.useState(true);
  const [installPathEmpty, setInstallPathEmpty] = React.useState(true);
  const [strings, setStrings] = React.useState(createLangContainer());
  const [stage, setStage] = React.useState<UpgradeStage>(props.upgrade);

  React.useEffect(() => {
    // Grab language data
    window.External.back.send<GetLanguageData>(BackIn.GET_LANGUAGE_DATA, undefined, (res) => {
      if (res.data) {
        setStrings(res.data);
      }
    });
    // Shrink window closer to good size
    remote.getCurrentWindow().setSize(850, 450);
  }, []);

  React.useEffect(() => {
    window.onbeforeunload = (event: BeforeUnloadEvent) => {
      if (installing && askBeforeClosing) {
        event.returnValue = 1; // (Prevent closing the window)
        remote.dialog.showMessageBox({
          type: 'warning',
          title: 'Exit Launcher?',
          message: 'All progress on downloading or installing the upgrade will be lost.\n'+
                    'Are you sure you want to exit?',
          buttons: ['Yes', 'No'],
          defaultId: 1,
          cancelId: 1,
        })
        .then(({ response }) => {
          if (response === 0) {
            setAskBeforeClosing(false);
            setTimeout(() => { window.close(); }, 100);
          }
        });
      } else {
        window.close();
      }
    };
  }, [installing, askBeforeClosing]);

  const onInputChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setInstallPath(val);
    setInstallPathValid(await isInstallPathValid(val));
    setExistingInstall(await isFlashpointValidCheck(val));
    setInstallPathEmpty(await isPathEmpty(val));
  }, [setInstallPath, setInstallPathValid, setExistingInstall]);

  const onBrowseClick = React.useCallback(async () => {
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectInstallDirectory,
      properties: ['openDirectory'],
    });
    if (filePaths) {
      // If existing path, select it instead
      const existing = await isFlashpointValidCheck(filePaths[0]);
      if (existing) {
        console.log(existing);
        setInstallPath(filePaths[0]);
        setInstallPathValid(await isInstallPathValid(filePaths[0]));
        setExistingInstall(true);
      } else {
        const realPath = path.join(filePaths[0], 'Flashpoint');
        setInstallPath(realPath);
        setInstallPathValid(await isInstallPathValid(realPath));
        setExistingInstall(await isFlashpointValidCheck(realPath));
        setInstallPathEmpty(await isPathEmpty(realPath));
      }
     }
  }, [setInstallPath, setInstallPathValid, setExistingInstall]);

  const onInstall = React.useCallback(() => {
    console.log(existingInstall);
    if (existingInstall) {
      // Don't install, just set path and restart
      window.onbeforeunload = () => {};
      window.External.back.send<any>(BackIn.FINISH_SETUP, undefined);
      window.External.back.send<any, UpdateConfigData>(BackIn.UPDATE_CONFIG, {
        flashpointPath: installPath
      }, () => { window.External.restart(); });
      // Return to prevent download from starting
      return;
    }
    console.log('Starting Install');
    fs.mkdirSync(installPath, { recursive: true });
    setInstalling(true);
    for (let source of stage.sources) {
      const filename = stage.id + '__' + source.split('/').pop() || 'unknown';
      let lastUpdateType = '';
      // Start download and installation
      let prevProgressUpdate = Date.now();
      const state = downloadAndInstallUpgrade(stage, {
        installPath: path.resolve(installPath),
        downloadFilename: filename
      })
      .on('progress', () => {
        const now = Date.now();
        if (now - prevProgressUpdate > 100 || lastUpdateType != state.currentTask) {
          prevProgressUpdate = now;
          lastUpdateType = state.currentTask;
          switch (state.currentTask) {
            case 'downloading': setStageState(stage, setStage, { installProgressNote: `${strings.misc.downloading}: ${(state.downloadProgress * 100).toFixed(1)}%` }); break;
            case 'extracting':  setStageState(stage, setStage, { installProgressNote: `${strings.misc.extracting}: ${(state.extractProgress * 100).toFixed(1)}%` });   break;
            case 'installing':  setStageState(stage, setStage, { installProgressNote: `${strings.misc.installingFiles}`});                                         break;
            default:            setStageState(stage, setStage, { installProgressNote: '...' });                                                        break;
          }
        }
      })
      .once('done', async () => {
        // Flag as done installing
        setStageState(stage, setStage, {
          isInstalling: false,
          isInstallationComplete: true,
        });
        window.onbeforeunload = () => {};
        window.External.back.send<any>(BackIn.FINISH_SETUP, undefined);
        window.External.back.send<any, UpdateConfigData>(BackIn.UPDATE_CONFIG, {
          flashpointPath: installPath
        }, () => { window.External.restart(); });
      })
      .once('error', (error: any) => {
        // Flag as not installing (so the user can retry if they want to)
        setStageState(stage, setStage, {
          isInstalling: false,
        });
        console.error(error);
      })
      .on('warn', console.warn);
    }
  }, [installPath, existingInstall]);

  const warningStrs = React.useMemo(() => {
    let warns = [];
    // Existing warning
    existingInstall ? warns.push(strings.setup.warnExistingInstall) : noop;
    // Invalid warning (if path is given)
    (!installPathValid && installPath != '') ? warns.push(strings.setup.warnInvalidPath) : noop;
    // Not Empty warning (if not existing install)
    (!installPathEmpty && !existingInstall) ? warns.push(strings.setup.warnNotEmpty) : noop;
    return warns;
  }, [existingInstall, installPathValid, installPathEmpty, installPath]);

  return React.useMemo(() => (
    <>
      { window.External.config.data.useCustomTitlebar ? (
        <TitleBar title={`${AppConstants.APP_TITLE} (${remote.app.getVersion()})`} />
      ) : undefined }
      <div className='setup-page simple-scroll'>
        <div className='setup-page__title'>
          {strings.setup.title}
        </div>

        <div className='setting'>
          <p className='setting__title'>{strings.setup.selectInstallPath}</p>
          <p className='setting__title'>{strings.setup.existingFolderAllowed}</p>
          <div className='setting__body'>
            {/* Install Path */}
            <div className='setting__row'>
              <div className='setting__row__top'>
                <div className='setting__row__title'>
                  <p>{strings.setup.flashpointPath}</p>
                </div>
                <div className='setting__row__content setting__row__content--toggle'>
                  <div className='setup-page__selection'>
                    <input
                      type='text'
                      className={'input-field simple-input ' + (installing ? 'setup-page__wide' : 'input-field--edit')}
                      onChange={onInputChange}
                      value={installPath}
                      disabled={installing} />
                    <input
                      type='button'
                      value={strings.config.browse}
                      className='simple-button'
                      onClick={onBrowseClick}
                      disabled={installing} />
                  </div>
                </div>
              </div>
              <div className='setting__row__bottom'/>
            </div>
          </div>
        </div>

        { warningStrs.map((warn, index) => (
          <p className='setting__title' key={index}>{ warn }</p>
        ))}

        { installPath != '' ?
          <div className='setup-page__buttons'>
            <input
              type='button'
              value={existingInstall ? strings.setup.startFlashpoint : strings.setup.install}
              className='simple-button large-button'
              onClick={onInstall}
              disabled={(!installPathValid) || installing} />
          </div>
        : undefined}

        <p className='setup-page__status'>{stage.state.installProgressNote}</p>
      </div>
    </>
  ), [strings, installPath, installPathValid, stage, installing,
      warningStrs]);
}

function setStageState(stage: UpgradeStage, setUpgradeStage: React.Dispatch<React.SetStateAction<UpgradeStage>>, data: Partial<UpgradeStageState>) {
  const newStageState: UpgradeStageState = {...deepCopy(stage.state), ...data};
  const newStage: UpgradeStage = {...stage, state: newStageState};
  setUpgradeStage(newStage);
}

async function isPathEmpty(installPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    fs.promises.access(installPath, fs.constants.F_OK)
    .then(() => {
      // Folder exists, check if empty
      fs.promises.readdir(installPath)
      .then((files) => resolve(!files.length))
      .catch((err) => resolve(false));
    })
    .catch((err) => {
      // Folder doesn't exist, must be empty
      resolve(true);
    });
  });
}

async function isInstallPathValid(installPath: string): Promise<boolean> {
  // Check path exists
  console.log(installPath);
  return await fs.lstat(installPath)
  .then((stats) => {
    if (stats.isDirectory()) {
      // Path exists, is dir, check if we have perms to write to it
      return canReadWrite(installPath);
    }
    // Is file
    return false;
  })
  .catch((error) => {
    // Path doesn't exist, try parent until we hit bottom dir
    if (path.dirname(installPath) != '.') {
      return isInstallPathValid(path.dirname(installPath));
    } else {
      return false;
    }
  });
}