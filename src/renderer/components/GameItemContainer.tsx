import * as React from 'react';
import { GameDragEventData } from './pages/BrowsePage';

/** All props of a DIV element (except for "ref"). */
type HTMLDivProps = React.HTMLAttributes<HTMLDivElement>;

export type GameItemContainerProps = HTMLDivProps & {
  /** Reference to the underlying DIV element. */
  realRef?: React.JSX.IntrinsicElements['div']['ref'];
  onContentSelect?:      (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined) => void;
  onContentLaunch?:      (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onGameContextMenu?: (event: React.MouseEvent<HTMLDivElement>, gameId: string, logoPath: string, screenshotPath: string) => void;
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
  children:       React.ReactNode;
};

/**
 * A DIV element with additional props that listens for "game item" events that bubbles up.
 * This is more efficient than listening for events on each "game item" individually.
 */

export function GameItemContainer(props: GameItemContainerProps) {
  const { realRef, children } = props;

  const onDrop = (event: React.DragEvent) => {
    if (props.onGameDrop) {
      props.onGameDrop(event);
    }
  };

  const onDragOver = (event: React.DragEvent) => {
    if (props.onGameDragOver) {
      props.onGameDragOver(event);
    }
  };

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (props.onClick) { props.onClick(event); }
    if (props.onContentSelect) {
      props.onContentSelect(event, findGameDragEventData(event.target)?.gameId);
    }
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (props.onDoubleClick) { props.onDoubleClick(event); }
    if (props.onContentLaunch) {
      const gameId = findGameDragEventData(event.target)?.gameId;
      if (gameId !== undefined) { props.onContentLaunch(event, gameId); }
    }
  };

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (props.onContextMenu) { props.onContextMenu(event); }
    if (props.onGameContextMenu) {
      const dragData = findGameDragEventData(event.target);
      if (dragData?.gameId !== undefined) { props.onGameContextMenu(event, dragData?.gameId, dragData?.logoPath, dragData?.screenshotPath); }
    }
  };

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (props.onDragStart) { props.onDragStart(event); }
    if (props.onGameDragStart) {
      const data = findGameDragEventData(event.target);
      if (data !== undefined) { props.onGameDragStart(event, data); }
    }
  };

  const onDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (props.onDragEnd) { props.onDragEnd(event); }
    if (props.onGameDragEnd) {
      props.onGameDragEnd(event);
    }
  };

  const findGameDragEventData = (target: EventTarget) => {
    return props.findGameDragEventData(target);
  };

  return (
    <div
      { ...filterDivProps(props) }
      ref={realRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onDragOver={onDragOver}>
      {children}
    </div>
  );
}

// Create a shallow copy of the props object, but without all non-div element props.
function filterDivProps(props: GameItemContainerProps): React.JSX.IntrinsicElements['div'] {
  const rest: HTMLDivProps & {
    // These need to be explicitly specified: the compiler doesn't infer them correctly.
    realRef?: any;
    onContentSelect?: any;
    onContentLaunch?: any;
    onGameContextMenu?: any;
    onGameDragStart?: any;
    onGameDragEnd?: any;
    onGameDrop?: any;
    onGameDragOver?: any;
    findGameDragEventData?: any;
    findGameId?: any;
  } = Object.assign({}, props);
  delete rest.realRef;
  delete rest.onContentSelect;
  delete rest.onContentLaunch;
  delete rest.onGameContextMenu;
  delete rest.onGameDragStart;
  delete rest.onGameDragEnd;
  delete rest.onGameDrop;
  delete rest.onGameDragOver;
  delete rest.findGameDragEventData;
  delete rest.findGameId;
  return rest;
}
