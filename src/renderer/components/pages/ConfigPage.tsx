import * as React from 'react';
import { IAppConfigData } from '../../../shared/config/IAppConfigData';
import { PathInput } from '../config/PathInput';

export interface IConfigPageProps {
  config: IAppConfigData;
}

export class ConfigPage extends React.Component<IConfigPageProps, {}> {
  constructor(props: IConfigPageProps) {
    super(props);
  }

  render() {
    const config = this.props.config;
    return (
      <div className="config-page">
        <h2>Config</h2>
        <div className="config-page__setting">
          <div className="config-page__setting__row">
            <p>FlashPoint Path:</p>
          </div>
          <div className="config-page__setting__row">
            <PathInput defaultInput={config.flashpointPath} />
          </div>
        </div>
        <div className="config-page__setting">
          <div className="config-page__setting__row">
            <p>Use Custom Toolbar:</p>
            <input type="checkbox" readOnly={true} checked={config.useCustomTitlebar}></input>
          </div>
        </div>
      </div>
    );
  }
}
