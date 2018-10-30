import * as React from 'react';

export class PlaylistPage extends React.Component<{}, {}> {
  constructor(props: {}) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className='playlist-page simple-scroll'>
        <div className='playlist-page__inner'>
          These are not the playlists you are looking for.
        </div>
      </div>
    );
  }
}
