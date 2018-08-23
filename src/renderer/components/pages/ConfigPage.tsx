import * as React from 'react';
import { IAppConfigData } from '../../../shared/config/IAppConfigData';

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
        <div className="config-page__row">
          <p>FlashPoint Path:</p>
          <input readOnly={true} value={config.flashpointPath} />
        </div>
        <div className="config-page__row">
          <p>Use Custom Toolbar:</p>
          <input type="checkbox" readOnly={true} checked={config.useCustomTitlebar}></input>
        </div>
      </div>
    );
  }
}
