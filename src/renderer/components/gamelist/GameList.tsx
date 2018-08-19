import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { Thumbnail } from '../common/Thumbnail';
import { LaunchBoxGame } from '../../../shared/launchbox/LaunchBoxGame';
import { GameListItem } from './GameListItem';

export interface IGameListProps extends IDefaultProps {
  imageFolder?: string;
  games?: ILaunchBoxGame[];
}
export interface IGameListState {
}

export class GameList extends React.Component<IGameListProps, IGameListState> {
  private _list: React.RefObject<List> = React.createRef();

  constructor(props: IGameListProps) {
    super(props);
    this.state = {
    };
    this.noRowsRenderer = this.noRowsRenderer.bind(this);
    this.rowRenderer = this.rowRenderer.bind(this);
  }
  
  render() {
    const games = this.props.games || [];
    return (
      <div className="game-browser">
        <AutoSizer>
          {({width, height}) => {
            return (
              <List 
                ref={this._list}
                className="game-list"
                width={width}
                height={height}
                rowHeight={50}
                rowCount={games.length}
                overscanRowCount={8}
                noRowsRenderer={this.noRowsRenderer}
                rowRenderer={this.rowRenderer} />
            );
          }}
        </AutoSizer>
      </div>
    );
  }
  
  noRowsRenderer() {
    return (
      <div className="game-list__no-games">
        <h1 className="game-list__no-games__title">No Games Found!</h1>
        <br/>
        {(this.props.imageFolder === '') ? ( // Check if the "flashpointPath" setting in the config has been changed
          <>
            Have you set value of <i>"flashpointPath"</i> in <i>"config.json"</i>?<br/>
            It should point at the top folder of FlashPoint (Example: "C:/Users/Adam/Downloads/Flashpoint Infinity 4.0").<br/>
            <br/>
            Note: You have to restart this application for the config file to reload.
            <br/>
            Tip: Don't use single back-slashes ("\") in the path because that won't work.
            Use double back-slashes ("\\") or single forward-slashes ("/") instead.
          </>
        ):(
          <>
            No game title matched your search.<br/>
            Try searching for something less restrictive.
          </>
        )}
      </div>
    );
  }
  
  rowRenderer(props: ListRowProps): React.ReactNode {
    const game = (this.props.games as ILaunchBoxGame[])[props.index];
    // Render
    return (
      <GameListItem key={props.key} {...props} game={game} imageFolder={this.props.imageFolder||''} />
    );
  }
}
