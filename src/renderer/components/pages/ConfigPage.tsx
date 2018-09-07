import * as React from 'react';
import * as path from 'path';
import { IAppConfigData } from '../../../shared/config/IAppConfigData';
import { PathInput } from '../config/PathInput';
import { Toggle } from '../config/Toggle';
import { isFlashpointValidCheck } from '../../../shared/checkSanity';
import { AppConfig } from '../../../shared/config/AppConfig';
import { deepCopy, recursiveReplace } from '../../../shared/Util';

export interface IConfigPageProps {
  /** Application config (the one currently is place) */
  config: IAppConfigData;
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
    this.state = {
      isFlashpointPathValid: undefined,
      flashpointPath: props.config.flashpointPath,
      useCustomTitlebar: props.config.useCustomTitlebar,
      startRouter: props.config.startRouter,
      startRedirector: props.config.startRedirector,
      useFiddler: props.config.useFiddler,
    };
    this.onFlashpointPathChange = this.onFlashpointPathChange.bind(this);
    this.onUseCustomTitlebarChange = this.onUseCustomTitlebarChange.bind(this);
    this.onStartRouterOnChange = this.onStartRouterOnChange.bind(this);
    this.onStartRedirectorOnChange = this.onStartRedirectorOnChange.bind(this);
    this.onUseFiddlerOnChange = this.onUseFiddlerOnChange.bind(this);
    this.onSaveAndRestartClick = this.onSaveAndRestartClick.bind(this);
  }

  render() {
    return (
      <div className="config-page">
        <div className="config-page__inner">
          <h1 className="config-page__title">Config</h1>
          <i>(You must press "Save & Restart" for changes to take effect)</i>

          <div className="setting">
            <p className="setting__title">Flashpoint</p>
            <div className="setting__row">
              <div className="setting__row__title">
                <p>FlashPoint Path</p>
              </div>
              <div className="setting__row__content setting__row__content--flashpoint-path">
                <PathInput input={this.state.flashpointPath}
                          onInputChange={this.onFlashpointPathChange}
                          isValid={this.state.isFlashpointPathValid} />
              </div>
            </div>
            <div className="setting__row">
              <div className="setting__row__title">
                <p>Start Router</p>
              </div>
              <div className="setting__row__content setting__row__content--toggle">
                <div>
                  <Toggle checked={this.state.startRouter} 
                          onChange={this.onStartRouterOnChange} />
                </div>
              </div>
            </div>
            <div className="setting__row">
              <div className="setting__row__title">
                <p>Start Redirector (Windows only)</p>
              </div>
              <div className="setting__row__content setting__row__content--toggle">
                <div>
                  <Toggle checked={this.state.startRedirector} 
                          onChange={this.onStartRedirectorOnChange} />
                </div>
              </div>
            </div>
            <div className="setting__row">
              <div className="setting__row__title">
                <p>Use Fiddler instead of Redirector (Windows only)</p>
              </div>
              <div className="setting__row__content setting__row__content--toggle">
                <div>
                  <Toggle checked={this.state.useFiddler} 
                          onChange={this.onUseFiddlerOnChange} />
                </div>
              </div>
            </div>
          </div>

          <div className="setting">
            <p className="setting__title">Window</p>
            <div className="setting__row">
              <div className="setting__row__title">
                <p>Use Custom Toolbar</p>
              </div>
              <div className="setting__row__content setting__row__content--toggle">
                <div>
                  <Toggle checked={this.state.useCustomTitlebar} 
                          onChange={this.onUseCustomTitlebarChange} />
                </div>
              </div>
            </div>
          </div>

          <div className="setting">
            <div className="setting__row">
              <input type="button" value="Save & Restart" className="simple-button save-and-restart" onClick={this.onSaveAndRestartClick} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  /** When the "FlashPoint Folder Path" input text is changed */
  async onFlashpointPathChange(filePath: string) {
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
    let newConfig = recursiveReplace(deepCopy(this.props.config), {
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
