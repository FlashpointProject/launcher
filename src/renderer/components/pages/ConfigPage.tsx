import * as React from 'react';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { isFlashpointValidCheck } from '../../../shared/checkSanity';
import { deepCopy, recursiveReplace } from '../../../shared/Util';
import { CheckBox } from '../CheckBox';
import { AppConfig } from '../../../shared/config/AppConfigFile';
import { WithPreferencesProps } from '../../../renderer/containers/withPreferences';

interface OwnProps {
}

export type IConfigPageProps = OwnProps & WithPreferencesProps;

export interface IConfigPageState {
  isFlashpointPathValid?: boolean;
  // -- Configs --
  flashpointPath: string;
  useCustomTitlebar: boolean;
  useFiddler: boolean;
}

export class ConfigPage extends React.Component<IConfigPageProps, IConfigPageState> {
  constructor(props: IConfigPageProps) {
    super(props);
    const configData = window.External.config.data;
    this.state = {
      isFlashpointPathValid: undefined,
      flashpointPath: configData.flashpointPath,
      useCustomTitlebar: configData.useCustomTitlebar,
      useFiddler: configData.useFiddler,
    };
  }

  render() {
    return (
      <div className='config-page simple-scroll'>
        <div className='config-page__inner'>
          <h1 className='config-page__title'>Config</h1>
          <i>(You must press 'Save & Restart' for some changes to take effect)</i>

          {/* -- Preferences -- */}
            <div className='setting'>
              <p className='setting__title'>Preferences</p>
              <div className='setting__body'>
                {/* Show Extreme Games */}
                {((!window.External.config.data.disableExtremeGames)) ? (
                  <div className='setting__row'>
                    <div className='setting__row__top'>
                      <div className='setting__row__title'>
                        <p>Show Extreme Games</p>
                      </div>
                      <div className='setting__row__content setting__row__content--toggle'>
                        <div>
                          <CheckBox checked={this.props.preferencesData.browsePageShowExtreme} onChange={this.onShowExtremeChange} />
                        </div>
                      </div>
                    </div>
                    <div className='setting__row__bottom'>
                      <p>Show games with sexual, violent or other content unsuitable for children.</p>
                    </div>
                  </div>
                ) : undefined }
                {/* Enable Editing */}
                <div className='setting__row'>
                  <div className='setting__row__top'>
                    <div className='setting__row__title'>
                      <p>Enable Editing</p>
                    </div>
                    <div className='setting__row__content setting__row__content--toggle'>
                      <div>
                        <CheckBox checked={this.props.preferencesData.enableEditing} onChange={this.onEnableEditingChange} />
                      </div>
                    </div>
                  </div>
                  <div className='setting__row__bottom'>
                    <p>Enable editing of games, additional applications and playlists.</p>
                  </div>
                </div>
              </div>
            </div>

          {/* -- Flashpoint -- */}
          <div className='setting'>
            <p className='setting__title'>Flashpoint</p>
            <div className='setting__body'>
              {/* Flashpoint Path */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <p className='setting__row__title'>Flashpoint Path</p>
                  <div className='setting__row__content setting__row__content--flashpoint-path'>
                    <ConfigFlashpointPathInput input={this.state.flashpointPath}
                                               onInputChange={this.onFlashpointPathChange}
                                               isValid={this.state.isFlashpointPathValid} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Path to the Flashpoint folder (can be relative)</p>
                </div>
              </div>
              {/* Redirector / Fiddler */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Redirector</p>
                  </div>
                  <div className='setting__row__content setting__row__content--redirector'>
                    <div>
                      <input type="radio" checked={!this.state.useFiddler} onChange={this.onRedirectorRedirectorChange}/>
                      <p>Redirector</p>
                    </div>
                    <div>
                      <input type="radio" checked={this.state.useFiddler} onChange={this.onRedirectorFiddlerChange}/>
                      <p>Fiddler</p>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Which software to use for redirecting the game traffic to the local web server. Neither is used on Linux.</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Window -- */}
          <div className='setting'>
            <p className='setting__title'>Window</p>
            <div className='setting__body'>
              {/* -- Custom Title Bar -- */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Use Custom Title Bar</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox checked={this.state.useCustomTitlebar} 
                                onChange={this.onUseCustomTitlebarChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Use a custom title bar at the top of this window.</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Advanced -- */}
          <div className='setting'>
            <p className='setting__title'>Advanced</p>
            <div className='setting__body'>
              {/* -- Show Developer Tab -- */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Show Developer Tab</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox checked={this.props.preferencesData.showDeveloperTab} onChange={this.onShowDeveloperTab} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Show the "Developer" tab. This is most likely only useful for developers and curators.</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Save & Restart -- */}
          <div className='setting'>
            <div className='setting__row'>
              <input type='button' value='Save & Restart' className='simple-button save-and-restart' onClick={this.onSaveAndRestartClick} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  private onShowExtremeChange = (isChecked: boolean): void => {
    this.props.updatePreferences({ browsePageShowExtreme: isChecked });
    this.forceUpdate();
  }

  private onEnableEditingChange = (isChecked: boolean): void => {
    this.props.updatePreferences({ enableEditing: isChecked });
    this.forceUpdate();
  }

  private onRedirectorRedirectorChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ useFiddler: !event.target.checked });
  }
  private onRedirectorFiddlerChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ useFiddler: event.target.checked });
  }

  /** When the "FlashPoint Folder Path" input text is changed */
  private onFlashpointPathChange = async (filePath: string): Promise<void> => {
    this.setState({ flashpointPath: filePath });
    // Check if the file-path points at a valid FlashPoint folder
    const isValid = await isFlashpointValidCheck(filePath);
    this.setState({ isFlashpointPathValid: isValid });
  }
  
  /** When the different toggles are checked/unchecked */
  private onUseCustomTitlebarChange = (isChecked: boolean): void => {
    this.setState({ useCustomTitlebar: isChecked });
  }
  
  private onShowDeveloperTab = (isChecked: boolean): void => {
    this.props.updatePreferences({ showDeveloperTab: isChecked });
    this.forceUpdate();
  }

  /** When the "Save & Restart" button is clicked */
  private onSaveAndRestartClick = (event: React.MouseEvent<HTMLInputElement>) => {
    // Create new config
    let newConfig = recursiveReplace(deepCopy(window.External.config.data), {
      flashpointPath: this.state.flashpointPath,
      useCustomTitlebar: this.state.useCustomTitlebar,
      useFiddler: this.state.useFiddler,
    });
    // Save new config to file, then restart the app
    AppConfig.saveConfigFile(newConfig)
    .then(() => { window.External.restart(); })
    .catch((error: Error) => { console.log(error); });
  }
}
