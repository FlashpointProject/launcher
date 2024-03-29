import * as React from 'react';
import { GameDragEventData } from './pages/BrowsePage';

/** All props of a DIV element (except for "ref"). */
type HTMLDivProps = React.HTMLAttributes<HTMLDivElement>;

export type GameItemContainerProps = HTMLDivProps & {
  /** Reference to the underlying DIV element. */
  realRef?: JSX.IntrinsicElements['div']['ref'];
  onGameSelect?:      (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined) => void;
  onGameLaunch?:      (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onGameContextMenu?: (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onGameDragStart?:   (event: React.DragEvent<HTMLDivElement>,  dragEventData: GameDragEventData) => void;
  onGameDragEnd?:     (event: React.DragEvent<HTMLDivElement>) => void;
  onGameDrop?:        (event: React.DragEvent) => void;
  onGameDragOver?:    (event: React.DragEvent) => void;
  /**
   * Find the game ID of an element (or sub-element) of a game.
   *
   * @param element Element or sub-element of a game.
   * @returns The game's ID (or undefined if no game was found).
   */
  findGameDragEventData: (element: EventTarget) => GameDragEventData | undefined;
  // TODO: Check if needed for removal
  // Override functions for the...overrides?
  onClick?:       (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?:   (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?:     (event: React.DragEvent<HTMLDivElement>) => void;
};

/**
 * A DIV element with additional props that listens for "game item" events that bubbles up.
 * This is more efficient than listening for events on each "game item" individually.
 */
export class GameItemContainer extends React.Component<GameItemContainerProps> {
  render() {
    return (
      <div
        { ...filterDivProps(this.props) }
        ref={this.props.realRef}
        onClick={this.onClick}
        onDoubleClick={this.onDoubleClick}
        onContextMenu={this.onContextMenu}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onDrop={this.onDrop}
        onDragOver={this.onDragOver}>
        {this.props.children}
      </div>
    );
  }

  onDrop = (event: React.DragEvent) => {
    if (this.props.onGameDrop) {
      this.props.onGameDrop(event);
    }
  };

  onDragOver = (event: React.DragEvent) => {
    if (this.props.onGameDragOver) {
      this.props.onGameDragOver(event);
    }
  };

  onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onClick) { this.props.onClick(event); }
    if (this.props.onGameSelect) {
      this.props.onGameSelect(event, this.findGameDragEventData(event.target)?.gameId);
    }
  };

  onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onDoubleClick) { this.props.onDoubleClick(event); }
    if (this.props.onGameLaunch) {
      const gameId = this.findGameDragEventData(event.target)?.gameId;
      if (gameId !== undefined) { this.props.onGameLaunch(event, gameId); }
    }
  };

  onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onContextMenu) { this.props.onContextMenu(event); }
    if (this.props.onGameContextMenu) {
      const gameId = this.findGameDragEventData(event.target)?.gameId;
      if (gameId !== undefined) { this.props.onGameContextMenu(event, gameId); }
    }
  };

  onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (this.props.onDragStart) { this.props.onDragStart(event); }
    if (this.props.onGameDragStart) {
      const data = this.findGameDragEventData(event.target);
      if (data !== undefined) { this.props.onGameDragStart(event, data); }
    }
  };

  onDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (this.props.onDragEnd) { this.props.onDragEnd(event); }
    if (this.props.onGameDragEnd) {
      this.props.onGameDragEnd(event);
    }
  };

  findGameDragEventData(target: EventTarget): GameDragEventData | undefined {
    return this.props.findGameDragEventData(target);
  }
}

// Create a shallow copy of the props object, but without all non-div element props.
function filterDivProps(props: GameItemContainerProps): JSX.IntrinsicElements['div'] {
  const rest: HTMLDivProps & {
    // These need to be explicitly specified: the compiler doesn't infer them correctly.
    realRef?: any;
    onGameSelect?: any;
    onGameLaunch?: any;
    onGameContextMenu?: any;
    onGameDragStart?: any;
    onGameDragEnd?: any;
    onGameDrop?: any;
    onGameDragOver?: any;
    findGameId?: any;
  } = Object.assign({}, props);
  delete rest.realRef;
  delete rest.onGameSelect;
  delete rest.onGameLaunch;
  delete rest.onGameContextMenu;
  delete rest.onGameDragStart;
  delete rest.onGameDragEnd;
  delete rest.onGameDrop;
  delete rest.onGameDragOver;
  delete rest.findGameId;
  return rest;
}
