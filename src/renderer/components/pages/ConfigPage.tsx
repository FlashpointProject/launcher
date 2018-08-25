import * as React from 'react';
import * as path from 'path';
import { IAppConfigData } from '../../../shared/config/IAppConfigData';
import { PathInput } from '../config/PathInput';
import { Toggle } from '../config/Toggle';

export interface IConfigPageProps {
  config: IAppConfigData;
}

export interface IConfigPageState {
  isFlashpointPathValid?: boolean;
}

export class ConfigPage extends React.Component<IConfigPageProps, IConfigPageState> {
  constructor(props: IConfigPageProps) {
    super(props);
    this.state = {
      isFlashpointPathValid: undefined,
    };
    this.onFlashpointPathChange = this.onFlashpointPathChange.bind(this);
  }

  render() {
    const config = this.props.config;
    return (
      <div className="config-page">
        <h1>Config</h1>
        <div className="setting">
          <div className="setting__row">
            <p className="setting__title"><b>FlashPoint Path:</b></p>
          </div>
          <div className="setting__row flashpoint-path">
            <PathInput defaultInput={config.flashpointPath} 
                       onInputChange={this.onFlashpointPathChange} 
                       isValid={this.state.isFlashpointPathValid} />
          </div>
        </div>
        <div className="setting">
          <div className="setting__row">
            <p className="setting__title">
              <b>Use Custom Toolbar</b><i>(requires restart)</i><b>:</b>
            </p>
            <Toggle defaultChecked={config.useCustomTitlebar} />
          </div>
        </div>
      </div>
    );
  }

  onFlashpointPathChange(filePath: string): void {
    // Check if the filepath points to a valid FlashPoint folder
    const xmlPath = path.join(filePath, './Arcade/Data/Platforms/Flash.xml');
    const isValid = window.External.existsSync(xmlPath);
    this.setState({ isFlashpointPathValid: isValid });
  }
}
