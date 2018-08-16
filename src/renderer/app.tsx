import * as React from 'react';
import { AppRouter } from './router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LaunchBox } from '../shared/launchbox/LaunchBox';
import { LaunchboxData } from './LaunchboxData';
import { ILaunchBoxPlatform } from '../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from './components/generic/search/Search';

export interface IAppProps {
  history?: any;
}
export interface IAppState {
  platform?: ILaunchBoxPlatform;
  search?: ISearchOnSearchEvent;
}

export class App extends React.Component<IAppProps, IAppState> {
  constructor(props: IAppProps) {
    super(props);
    this.state = {
      platform: undefined,
    };
    this.onSearch = this.onSearch.bind(this);
    // Fetch LaunchBox data
    this.fetchLaunchBoxData();
  }
  render() {
    return (
      <>
        {/* "Header" stuff */}
        <Header onSearch={this.onSearch} />
        {/* "Main" / "Content" stuff */}
        <div className="main">
          <AppRouter platform={this.state.platform} search={this.state.search} />
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
    this.setState({
      search: event,
    });
  }
  private fetchLaunchBoxData() {
    LaunchboxData.fetch('../Data/Platforms/Flash.xml')
    .then((platform: ILaunchBoxPlatform) => {
      this.setState({
        platform: platform,
      });
    })
    .catch(console.log);
  }
}
