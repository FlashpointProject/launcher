import * as React from 'react';
import { AppRouter } from './router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

export interface IAppProps {
  history?: any;
}
export interface IAppState {
}

export class App extends React.Component<IAppProps, IAppState> {
  constructor(props: IAppProps) {
    super(props);
    this.state = {
      // ...
    };
  }
  render() {
    return (
      <div>
        {/* "Header" stuff */}
        <Header />
        {/* "Main" / "Content" stuff */}
        <div id="main">
          <AppRouter />
          <noscript id="nojs">
            <div style={{textAlign:'center'}}>
              This website requires JavaScript to be enabled.
            </div>
          </noscript>
        </div>
        {/* "Footer" stuff */}
        <Footer />
      </div>
    );
  }
}
