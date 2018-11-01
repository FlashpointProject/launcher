import * as React from 'react';

export class HomePage extends React.Component<{}, {}> {
  constructor(props: {}) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className='home-page simple-scroll'>
        <div className='home-page__inner'>
          Home.
        </div>
      </div>
    );
  }
}
