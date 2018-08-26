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
}

export class ConfigPage extends React.Component<IConfigPageProps, IConfigPageState> {
  constructor(props: IConfigPageProps) {
    super(props);
    this.state = {
      isFlashpointPathValid: undefined,
      flashpointPath: props.config.flashpointPath,
      useCustomTitlebar: props.config.useCustomTitlebar,
    };
    this.onFlashpointPathChange = this.onFlashpointPathChange.bind(this);
    this.onUseCustomTitlebarChange = this.onUseCustomTitlebarChange.bind(this);
    this.onSaveAndExitClick = this.onSaveAndExitClick.bind(this);
  }

  render() {
    return (
      <div className="config-page">
        <h1>Config</h1>
        <div className="setting">
          <div className="setting__row">
            <p className="setting__title">FlashPoint Path:</p>
          </div>
          <div className="setting__row flashpoint-path">
            <PathInput input={this.state.flashpointPath}
                       onInputChange={this.onFlashpointPathChange}
                       isValid={this.state.isFlashpointPathValid} />
          </div>
        </div>
        <div className="setting">
          <div className="setting__row">
            <p className="setting__title">Use Custom Toolbar:</p>
            <Toggle checked={this.state.useCustomTitlebar} 
                    onChange={this.onUseCustomTitlebarChange} />
          </div>
        </div>
        <div className="setting">
          <div className="setting__row">
            <input type="button" value="Save & Exit" onClick={this.onSaveAndExitClick} />
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
  
  /** When the "Use Custom Titlebar" checkbox is (un)checked */
  onUseCustomTitlebarChange(isChecked: boolean): void {
    this.setState({ useCustomTitlebar: isChecked });
  }

  /** When the "Save & Exit" button is clicked */
  onSaveAndExitClick(event: React.MouseEvent<HTMLInputElement>) {
    // Create new config
    let newConfig = recursiveReplace(deepCopy(this.props.config), {
      flashpointPath: this.state.flashpointPath,
      useCustomTitlebar: this.state.useCustomTitlebar,
    });
    // Save new config to file, then exit the app
    AppConfig.saveConfigFile(newConfig)
    .then(() => { window.External.close(); })
    .catch((error: Error) => { console.log(error); });
  }
}
