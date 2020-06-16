import * as React from 'react';

/** All props of a DIV element (except for "ref"). */
type HTMLDivProps = React.HTMLAttributes<HTMLDivElement>;

export type GameItemContainerProps = HTMLDivProps & {
  /** Reference to the underlying DIV element. */
  realRef?: JSX.IntrinsicElements['div']["ref"];
  onGameSelect?:      (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined) => void;
  onGameLaunch?:      (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onGameContextMenu?: (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onGameDragStart?:   (event: React.DragEvent<HTMLDivElement>,  gameId: string) => void;
  onGameDragEnd?:     (event: React.DragEvent<HTMLDivElement>,  gameId: string) => void;
  /**
   * Find the game ID of an element (or sub-element) of a game.
   * @param element Element or sub-element of a game.
   * @returns The game's ID (or undefined if no game was found).
   */
  findGameId: (element: EventTarget) => string | undefined;
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
        children={this.props.children} />
    );
  }

  onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onClick) { this.props.onClick(event); }
    if (this.props.onGameSelect) {
      this.props.onGameSelect(event, this.findGameId(event.target));
    }
  }

  onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onDoubleClick) { this.props.onDoubleClick(event); }
    if (this.props.onGameLaunch) {
      const gameId = this.findGameId(event.target);
      if (gameId !== undefined) { this.props.onGameLaunch(event, gameId); }
    }
  }

  onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (this.props.onContextMenu) { this.props.onContextMenu(event); }
    if (this.props.onGameContextMenu) {
      const gameId = this.findGameId(event.target);
      if (gameId !== undefined) { this.props.onGameContextMenu(event, gameId); }
    }
  }

  onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (this.props.onDragStart) { this.props.onDragStart(event); }
    if (this.props.onGameDragStart) {
      const gameId = this.findGameId(event.target);
      if (gameId !== undefined) { this.props.onGameDragStart(event, gameId); }
    }
  }

  onDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (this.props.onDragEnd) { this.props.onDragEnd(event); }
    if (this.props.onGameDragEnd) {
      const gameId = this.findGameId(event.target);
      if (gameId !== undefined) { this.props.onGameDragEnd(event, gameId); }
    }
  }

  /** Short-hand for "props.findGameId". */
  findGameId(target: EventTarget): string | undefined {
    return this.props.findGameId(target);
  }
}

/**
 * Create a shallow copy of the props object, but without all non-div element props.
 * @param props Properties to copy.
 */
function filterDivProps(props: GameItemContainerProps): JSX.IntrinsicElements['div'] {
  const rest = Object.assign({}, props);
  delete rest.realRef;
  delete rest.onGameSelect;
  delete rest.onGameLaunch;
  delete rest.onGameContextMenu;
  delete rest.onGameDragStart;
  delete rest.onGameDragEnd;
  delete rest.findGameId;
  return rest;
}
