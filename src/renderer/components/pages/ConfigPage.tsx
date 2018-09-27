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
  startRouter: boolean;
  startRedirector: boolean;
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
      startRouter: configData.startRouter,
      startRedirector: configData.startRedirector,
      useFiddler: configData.useFiddler,
    };
    this.onShowExtremeChange = this.onShowExtremeChange.bind(this);
    this.onFlashpointPathChange = this.onFlashpointPathChange.bind(this);
    this.onUseCustomTitlebarChange = this.onUseCustomTitlebarChange.bind(this);
    this.onStartRouterOnChange = this.onStartRouterOnChange.bind(this);
    this.onStartRedirectorOnChange = this.onStartRedirectorOnChange.bind(this);
    this.onUseFiddlerOnChange = this.onUseFiddlerOnChange.bind(this);
    this.onSaveAndRestartClick = this.onSaveAndRestartClick.bind(this);
  }

  render() {
    return (
      <div className='config-page'>
        <div className='config-page__inner'>
          <h1 className='config-page__title'>Config</h1>
          <i>(You must press 'Save & Restart' for some changes to take effect)</i>

          {/* -- Preferences -- */}
          {((!window.External.config.data.disableExtremeGames)) ? (
            <div className='setting'>
              <p className='setting__title'>Preferences</p>
              <div className='setting__body'>
                <div className='setting__row'>
                  <div className='setting__row__top'>
                    <div className='setting__row__title'>
                      <p>Show Extreme Games</p>
                    </div>
                    <div className='setting__row__content setting__row__content--toggle'>
                      <div>
                        <CheckBox checked={window.External.preferences.data.browsePageShowExtreme} 
                                  onChange={this.onShowExtremeChange} />
                      </div>
                    </div>
                  </div>
                  <div className='setting__row__bottom'>
                    <p>Show games with sexual, violent or other content unsuitable for children.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : undefined }

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
              {/* Router */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <p className='setting__row__title'>Start Router</p>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox checked={this.state.startRouter} 
                                onChange={this.onStartRouterOnChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Start the local webserver (and Router) on startup.</p>
                </div>
              </div>
              {/* Redirector */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Start Redirector</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox checked={this.state.startRedirector} 
                                onChange={this.onStartRedirectorOnChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Start the Redirector on startup. Linux does not need or use it.</p>
                </div>
              </div>
              {/* Fiddler */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Use Fiddler (instead of Redirector)</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox checked={this.state.useFiddler} 
                                onChange={this.onUseFiddlerOnChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Fiddler will be started instead of the Redirector. Try this if the Redirector doesn't work.</p>
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

  /** When the "FlashPoint Folder Path" input text is changed */
  async onFlashpointPathChange(filePath: string): Promise<void> {
    this.setState({ flashpointPath: filePath });
    // Check if the fileepath points at a valid FlashPoint folder
    const isValid = await isFlashpointValidCheck(filePath);
    this.setState({ isFlashpointPathValid: isValid });
  }
  
  // When the different toggles are checked/unchecked
  onUseCustomTitlebarChange(isChecked: boolean): void {
    this.setState({ useCustomTitlebar: isChecked });
  }
  onStartRouterOnChange(isChecked: boolean): void {
    this.setState({ startRouter: isChecked });
  }
  onStartRedirectorOnChange(isChecked: boolean): void {
    this.setState({ startRedirector: isChecked });
  }
  onUseFiddlerOnChange(isChecked: boolean): void {
    this.setState({ useFiddler: isChecked });
  }

  /** When the "Save & Restart" button is clicked */
  onSaveAndRestartClick(event: React.MouseEvent<HTMLInputElement>) {
    // Create new config
    let newConfig = recursiveReplace(deepCopy(window.External.config.data), {
      flashpointPath: this.state.flashpointPath,
      useCustomTitlebar: this.state.useCustomTitlebar,
      startRouter: this.state.startRouter,
      startRedirector: this.state.startRedirector,
      useFiddler: this.state.useFiddler,
    });
    // Save new config to file, then restart the app
    AppConfig.saveConfigFile(newConfig)
    .then(() => { window.External.restart(); })
    .catch((error: Error) => { console.log(error); });
  }
}
