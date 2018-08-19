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

export interface IAppProps {
  history?: any;
}
export interface IAppState {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
}

export class App extends React.Component<IAppProps, IAppState> {
  private _onSearch: boolean = false;

  constructor(props: IAppProps) {
    super(props);
    this.state = {
      central: undefined,
      search: undefined,
    };
    this.onSearch = this.onSearch.bind(this);
    // Start fetching data
    this.fetchStuff();
  }

  render() {
    // Check if a search was made - if so redirect to the browse page (this is a bit ghetto)
    let redirect = null;
    if (this._onSearch) {
      this._onSearch = false;
      redirect = <Redirect to="/browse" push={true} />;
    }
    // Render
    return (
      <>
        {/* Redirect */}
        { redirect }
        {/* "TitleBar" stuff */}
        <TitleBar title={`${AppConstants.appTitle} (${AppConstants.appVersionString})`} />
        {/* "Header" stuff */}
        <Header onSearch={this.onSearch} />
        {/* "Main" / "Content" stuff */}
        <div className="main">
          <AppRouter central={this.state.central} search={this.state.search} />
          <noscript className="nojs">
            <div style={{textAlign:'center'}}>
              This website requires JavaScript to be enabled.
            </div>
          </noscript>
        </div>
        {/* "Footer" stuff */}
        <Footer />
      </>
    );
  }

  private onSearch(event: ISearchOnSearchEvent): void {
    this._onSearch = true;
    this.setState({
      search: event,
    });
  }

  private fetchStuff() {
    // Get the config from the main process
    const config = window.External.getConfigSync();
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
}
