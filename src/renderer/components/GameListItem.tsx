import { num } from '@shared/utils/Coerce';
import { Game } from 'flashpoint-launcher';
import { DisplaySettings, GameListComponentProps } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { DynamicComponent } from './DynamicComponent';
import { GameDragEventData } from './pages/BrowsePage';

export type GameListItemProps = ListRowProps & {
  displaySettings: DisplaySettings;
  game?: Game;
  extreme: boolean;
  /** Don't render if extreme games is disabled, match header */
  showExtremeIcon: boolean;
  /** Updates to clear platform icon cache */
  logoVersion: number;
  /** If the row can be dragged (defaults to false). */
  isDraggable?: boolean;
  /** If the row is selected. */
  isSelected: boolean;
  /** If the row is being dragged. */
  isDragged: boolean;
  /** Path to the extreme icon */
  extremeIconPath: string;
  /** Icon for games in tag categories */
  tagGroupIconBase64: string;
  /** Game drag event */
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  totalWeight: number;
};

export function GameListItem(props: GameListItemProps) {
  const { extreme, tagGroupIconBase64, isDraggable, isSelected, isDragged, extremeIconPath, showExtremeIcon, index, style, onDrop,
    onDragOver } = props;
  const game = props.game!;
  // Pick class names
  let className = 'game-list-item';
  if (index % 2 === 0) { className += ' game-list-item--even';     }
  if (isSelected)      { className += ' game-list-item--selected'; }
  if (isDragged)       { className += ' game-list-item--dragged';  }
  // Set element attributes
  const attributes: any = {};
  attributes[GameListItem.idAttribute] = props.game?.id;
  attributes[GameListItem.indexAttribute] = index;
  attributes[GameListItem.logoPathAttribute] = props.game?.logoPath;
  attributes[GameListItem.screenshotPathAttribute] = props.game?.screenshotPath;

  const gameListComponentProps: GameListComponentProps = {
    isDragged,
    game,
    logoVersion: props.logoVersion,
  };

  // Render
  return (
    <li
      style={style}
      className={className}
      draggable={isDraggable}
      onDrop={onDrop}
      onDragOver={onDragOver}
      { ...attributes }>
      { game !== undefined && props.displaySettings.gameList.columns.filter(col => col.type === 'icon').map(col => {
        return <DynamicComponent key={col.rowComponent} props={gameListComponentProps} name={col.rowComponent} />;
      })}
      { showExtremeIcon &&
          (extreme ? (
            <div
              key='extreme-icon'
              className='game-list-item__icon'
              style={{ backgroundImage: `url("${extremeIconPath}")` }} />
          ) : (tagGroupIconBase64 ? (
            <div
              key='tag-group-icon'
              className='game-list-item__icon'
              style={{ backgroundImage: `url("${tagGroupIconBase64}")` }} />
          ) : (
            <div key='tag-group-icon-empty' className='game-list-item__icon' />
          )))
      }
      <div className='game-list-item__right'>
        { game !== undefined && props.displaySettings.gameList.columns.filter(col => col.type === 'normal').map((col, idx) => {
          return <div style={{ width: `${(col.weight / props.totalWeight) * 100}%` }}>
            <DynamicComponent key={idx} props={gameListComponentProps} name={col.rowComponent} />
          </div>;
        })}
      </div>
    </li>
  );
}

export namespace GameListItem {
  /** ID of the attribute used to store the game's id. */
  export const idAttribute = 'data-game-id';
  export const indexAttribute = 'data-game-index';
  export const logoPathAttribute = 'data-game-logo-path';
  export const screenshotPathAttribute = 'data-game-screenshot-path';

  /**
   * Get the data of the game displayed in a GameListItem element (or throw an error if it fails).
   *
   * @param element GameListItem element.
   */
  export function getDragEventData(element: Element): GameDragEventData {
    const gameId = element.getAttribute(GameListItem.idAttribute);
    const index = num(element.getAttribute(GameListItem.indexAttribute));
    const logoPath = element.getAttribute(GameListItem.logoPathAttribute) || '';
    const screenshotPath = element.getAttribute(GameListItem.screenshotPathAttribute) || '';
    if (typeof gameId !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return {
      gameId,
      index,
      logoPath,
      screenshotPath
    };
  }

  /**
   * Check if an element is the top element of GameListItem or not.
   *
   * @param element Potential element to check.
   */
  export function isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(GameListItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
