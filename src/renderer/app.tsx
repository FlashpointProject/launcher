import { ipcRenderer } from 'electron';
import * as path from 'path';
import * as React from 'react';
import { AppRouter } from './router';
import { Redirect } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LaunchboxData } from './LaunchboxData';
import { ISearchOnSearchEvent } from './components/generic/search/Search';
import { TitleBar } from './components/TitleBar';
import { ICentralState } from './interfaces';
import * as AppConstants from '../shared/AppConstants';
import { IGameOrderChangeEvent } from './components/GameOrder';
import { IGameCollection } from '../shared/game/interfaces';
import { IAppConfigData } from '../shared/config/IAppConfigData';

export interface IAppProps {
  history?: any;
}
export interface IAppState {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
  logData: string;
  config: IAppConfigData;

  useCustomTitlebar: boolean;
}

export class App extends React.Component<IAppProps, IAppState> {
  private _onSearch: boolean = false;

  constructor(props: IAppProps) {
    super(props);

    // Get the config from the main process
    const config = window.External.getConfigSync();
    // Normal constructor stuff
    this.state = {
      central: undefined,
      search: undefined,
      order: undefined,
      logData: '',

      config: config,
      useCustomTitlebar: config.useCustomTitlebar,
    };
    this.onSearch = this.onSearch.bind(this);
    this.onOrderChange = this.onOrderChange.bind(this);
    this.onLogDataUpdate = this.onLogDataUpdate.bind(this);
    // Fetch LaunchBox game data from the xml
    LaunchboxData.fetch(path.resolve(config.flashpointPath, './Arcade/Data/Platforms/Flash.xml'))
    .then((collection: IGameCollection) => {
      this.setState({
        central: {
          collection: collection,
          flashpointPath: config.flashpointPath,
        }
      });
    })
    .catch(console.log);
  }

  componentDidMount() {
    ipcRenderer.on('log-data-update', this.onLogDataUpdate);

    // Ask main to send us our first log-data-update msg.
    window.External.resendLogDataUpdate();
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('log-data-update', this.onLogDataUpdate);
  }

  private onLogDataUpdate(event: any, fullLog: string) {
    this.setState({
      logData: fullLog,
    });
  }

  render() {
    // Check if a search was made - if so redirect to the browse page (this is a bit ghetto)
    let redirect = null;
    if (this._onSearch) {
      this._onSearch = false;
      redirect = <Redirect to="/browse" push={true} />;
    }
    // Get game count (or undefined if no games are yet found)
    let gameCount: number|undefined;
    if (this.state.central && this.state.central.collection && this.state.central.collection.games) {
      gameCount = this.state.central.collection.games.length;
    }
    // Props to set to the router
    const routerProps = {
      central: this.state.central,
      search: this.state.search,
      order: this.state.order,
      logData: this.state.logData,
      config: this.state.config,
    };
    // Render
    return (
      <>
        {/* Redirect */}
        { redirect }
        {/* "TitleBar" stuff */}
        { this.state.useCustomTitlebar ? (
          <TitleBar title={`${AppConstants.appTitle} (${AppConstants.appVersionString})`} />
        ) : undefined }
        {/* "Header" stuff */}
        <Header onSearch={this.onSearch} onOrderChange={this.onOrderChange} />
        {/* "Main" / "Content" stuff */}
        <div className="main">
          <AppRouter {...routerProps} />
          <noscript className="nojs">
            <div style={{textAlign:'center'}}>
              This website requires JavaScript to be enabled.
            </div>
          </noscript>
        </div>
        {/* "Footer" stuff */}
        <Footer gameCount={gameCount} />
      </>
    );
  }

  private onSearch(event: ISearchOnSearchEvent): void {
    this._onSearch = true;
    this.setState({
      search: event,
    });
  }

  private onOrderChange(event: IGameOrderChangeEvent): void {
    this.setState({
      order: event,
    });
  }
}
