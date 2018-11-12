import * as React from 'react';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { isFlashpointValidCheck } from '../../../shared/checkSanity';
import { deepCopy, recursiveReplace } from '../../../shared/Util';
import { CheckBox } from '../CheckBox';
import { AppConfig } from '../../../shared/config/AppConfigFile';

export interface IConfigPageProps {
}

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
    this.onShowExtremeChange = this.onShowExtremeChange.bind(this);
    this.onEnableEditingChange = this.onEnableEditingChange.bind(this);
    this.onFlashpointPathChange = this.onFlashpointPathChange.bind(this);
    this.onUseCustomTitlebarChange = this.onUseCustomTitlebarChange.bind(this);
    this.onRedirectorRedirectorChange = this.onRedirectorRedirectorChange.bind(this);
    this.onRedirectorFiddlerChange = this.onRedirectorFiddlerChange.bind(this);
    this.onSaveAndRestartClick = this.onSaveAndRestartClick.bind(this);
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
                {/* */}
                {((!window.External.config.data.disableExtremeGames)) ? (
                  <div className='setting__row'>
                    <div className='setting__row__top'>
                      <div className='setting__row__title'>
                        <p>Show Extreme Games</p>
                      </div>
                      <div className='setting__row__content setting__row__content--toggle'>
                        <div>
                          <CheckBox checked={window.External.preferences.data.browsePageShowExtreme} onChange={this.onShowExtremeChange} />
                        </div>
                      </div>
                    </div>
                    <div className='setting__row__bottom'>
                      <p>Show games with sexual, violent or other content unsuitable for children.</p>
                    </div>
                  </div>
                ) : undefined }
                {/* */}
                <div className='setting__row'>
                  <div className='setting__row__top'>
                    <div className='setting__row__title'>
                      <p>Enable Editing</p>
                    </div>
                    <div className='setting__row__content setting__row__content--toggle'>
                      <div>
                        <CheckBox checked={window.External.preferences.data.enableEditing} onChange={this.onEnableEditingChange} />
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
  
  onShowExtremeChange(isChecked: boolean): void {
    window.External.preferences.data.browsePageShowExtreme = isChecked;
    this.forceUpdate();
  }

  onEnableEditingChange(isChecked: boolean): void {
    window.External.preferences.data.enableEditing = isChecked;
    this.forceUpdate();
  }

  onRedirectorRedirectorChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ useFiddler: !event.target.checked });
  }
  onRedirectorFiddlerChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ useFiddler: event.target.checked });
  }

  /** When the "FlashPoint Folder Path" input text is changed */
  async onFlashpointPathChange(filePath: string): Promise<void> {
    this.setState({ flashpointPath: filePath });
    // Check if the file-path points at a valid FlashPoint folder
    const isValid = await isFlashpointValidCheck(filePath);
    this.setState({ isFlashpointPathValid: isValid });
  }
  
  // When the different toggles are checked/unchecked
  onUseCustomTitlebarChange(isChecked: boolean): void {
    this.setState({ useCustomTitlebar: isChecked });
  }

  /** When the "Save & Restart" button is clicked */
  onSaveAndRestartClick(event: React.MouseEvent<HTMLInputElement>) {
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
