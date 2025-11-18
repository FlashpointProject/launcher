import { findGameDragEventDataGrid, findGameDragEventDataList } from '@renderer/Util';
import * as React from 'react';
import { GameDragEventData } from './pages/BrowsePage';

/** All props of a DIV element (except for "ref"). */
type HTMLDivProps = React.HTMLAttributes<HTMLDivElement>;

export type GameItemContainerProps = HTMLDivProps & {
  /** Reference to the underlying DIV element. */
  realRef?: React.JSX.IntrinsicElements['div']['ref'];
  onContentSelect?:   (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onContentDeselect?: (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  onContentLaunch?:   (event: React.MouseEvent<HTMLDivElement>, gameId: string) => void;
  selectedGameId?:    string;
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
  type: 'grid' | 'list';
  // TODO: Check if needed for removal
  // Override functions for the...overrides?
  onClick?:       (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?:   (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?:     (event: React.DragEvent<HTMLDivElement>) => void;
  // If given, will handle selection and deselection within the view itself
  children:       React.ReactNode;
};

/**
 * A DIV element with additional props that listens for "game item" events that bubbles up.
 * This is more efficient than listening for events on each "game item" individually.
 */

export function GameItemContainer(props: GameItemContainerProps) {
  const { realRef, children, type, selectedGameId } = props;
  const findGameDragEventData = type === 'grid' ? findGameDragEventDataGrid : findGameDragEventDataList;
  const lastClickTimeRef = React.useRef(0);
  const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (props.onClick) { props.onClick(event); }

    const id = findGameDragEventData(event.target)?.gameId;
    if (id && id !== selectedGameId && props.onContentSelect) {
      props.onContentSelect(event, id);
    }

    // Allow double click 300ms to cancel a deselection
    clickTimerRef.current = setTimeout(() => {
      console.log('deselect timeout');
      // Check if it's been 500ms since last click, if so, deselect
      if (id && id === selectedGameId && props.onContentDeselect) {
        console.log('DESELECT');
        if (timeSinceLastClick >= 500) {
          props.onContentDeselect(event, id);
        }
      }
    }, 300);

    lastClickTimeRef.current = now;
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent onDeselect from firing
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

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
    selectedGameId?: string;
    onContentSelect?: any;
    onContentDeselect?: any;
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
  delete rest.selectedGameId;
  delete rest.onContentSelect;
  delete rest.onContentDeselect;
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
