import * as path from 'path';
import * as React from 'react';
import { AppRouter } from './router';
import { Redirect } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LaunchboxData } from './LaunchboxData';
import { ILaunchBoxPlatform } from '../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from './components/generic/search/Search';
import { TitleBar } from './components/TitleBar';
import { ICentralState } from './interfaces';
import * as AppConstants from '../shared/AppConstants';
import { IGameOrderChangeEvent } from './components/GameOrder';

export interface IAppProps {
  history?: any;
}
export interface IAppState {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;

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
      useCustomTitlebar: config.useCustomTitlebar,
    };
    this.onSearch = this.onSearch.bind(this);
    this.onOrderChange = this.onOrderChange.bind(this);
    // Fetch LaunchBox game data from the xml
    LaunchboxData.fetch(path.resolve(config.flashpointPath, './Arcade/Data/Platforms/Flash.xml'))
    .then((platform: ILaunchBoxPlatform) => {
      this.setState({
        central: {
          platform: platform,
          flashpointPath: config.flashpointPath,
        }
      });
    })
    .catch(console.log);
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
    if (this.state.central && this.state.central.platform && this.state.central.platform.games) {
      gameCount = this.state.central.platform.games.length;
    }
    // Props to set to the router
    const routerProps = {
      central: this.state.central,
      search: this.state.search,
      order: this.state.order,
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
