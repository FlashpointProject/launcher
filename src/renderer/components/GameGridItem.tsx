import { num } from '@shared/utils/Coerce';
import * as React from 'react';
import { GridCellProps } from 'react-virtualized';
import { getPlatformIconURL } from '../Util';
import { GameDragEventData } from './pages/BrowsePage';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';
import { ViewGame } from 'flashpoint-launcher';
import { DynamicComponent } from './DynamicComponent';
import { DisplaySettings, GameGridComponentProps } from 'flashpoint-launcher-renderer';

export type GameGridItemProps = Partial<GridCellProps> & {
  displaySettings: DisplaySettings;
  game?: ViewGame;
  id: string;
  title: string;
  platforms: string[];
  extreme: boolean;
  /** Updates to clear platform icon cache */
  logoVersion: number;
  /** Path to the game's thumbnail. */
  thumbnail: string;
  /** Path to the game's screenshot */
  screenshot: string;
  /** If the cell can be dragged (defaults to false). */
  isDraggable?: boolean;
  /** If the cell is selected. */
  isSelected: boolean;
  /** If the cell is being dragged. */
  isDragged: boolean;
  /** Path to the extreme icon */
  extremeIconPath: string;
  /** Icon for games in tag categories */
  tagGroupIconBase64: string;
  /** On Drop event */
  onDrop?: (event: React.DragEvent) => void;
  /** Screenshot Preview Mode */
  screenshotPreviewMode: ScreenshotPreviewMode;
  /** Screenshot Preview Delay */
  screenshotPreviewDelay: number;
  /** Whether to hide extreme screenshots */
  hideExtremeScreenshots: boolean;
};

// Displays a single game. Meant to be rendered inside a grid.
export function GameGridItem(props: GameGridItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showScreenshot, setShowScreenshot] = React.useState(false);
  const { screenshotPreviewDelay } = props;

  React.useEffect(() => {
    let timeoutId: any; // It's a timeout
    if (isHovered) {
      timeoutId = setTimeout(() => {
        setShowScreenshot(true);
      }, screenshotPreviewDelay); // Delay in milliseconds
    } else {
      setShowScreenshot(false);
    }
    return () => clearTimeout(timeoutId); // Cleanup timeout on component unmount or if hover state changes
  }, [isHovered, screenshotPreviewDelay]);

  const { rowIndex, id, title, platforms, thumbnail, screenshot, extreme, tagGroupIconBase64, isDraggable, isSelected, isDragged, extremeIconPath, style, onDrop } = props;
  // Get the platform icon path
  let willShowScreenshot = false;
  if (props.screenshotPreviewMode === ScreenshotPreviewMode.ALWAYS) {
    if (!props.hideExtremeScreenshots || !props.extreme) {
      willShowScreenshot = true;
    }
  } else if (props.screenshotPreviewMode === ScreenshotPreviewMode.ON && showScreenshot) {
    if (!props.hideExtremeScreenshots || !props.extreme) {
      willShowScreenshot = true;
    }
  }
  const platformIcons = platforms.slice(0, 5).map(p => getPlatformIconURL(p, props.logoVersion));
  // Pick class names
  let className = 'game-grid-item';
  if (isSelected) { className += ' game-grid-item--selected'; }
  if (isDragged)  { className += ' game-grid-item--dragged';  }

  const attributes: any = {};
  attributes[GameGridItem.idAttribute] = id;
  attributes[GameGridItem.indexAttribute] = rowIndex;
  attributes[GameGridItem.logoPathAttribute] = props.game?.logoPath;
  attributes[GameGridItem.screenshotPathAttribute] = props.game?.screenshotPath;

  const gameGridComponentProps: GameGridComponentProps = {
    isSelected,
    isDragged,
    game: props.game
  };

  // Memoize render
  return (
    <li
      style={style}
      className={className}
      draggable={isDraggable}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      { ...attributes }>
      <div className='game-grid-item__thumb'>
        <div
          className='game-grid-item__thumb__image'
          style={{ backgroundImage: `url('${ willShowScreenshot ? screenshot : thumbnail }')` }}>
          <div className='game-grid-item__thumb__icons--upper'>
            { props.displaySettings.gameGrid.upper.map((name) => {
              return (
                <DynamicComponent name={name} props={gameGridComponentProps}/>
              );
            })}
            {(extreme) ? (
              <div
                className='game-grid-item__thumb__icons__icon'
                style={{ backgroundImage: `url('${extremeIconPath}')` }} />
            ) : (
              <div
                className='game-grid-item__thumb__icons__icon'
                style={{ backgroundImage: `url("${tagGroupIconBase64}")` }} />
            )}
          </div>
          <div className='game-grid-item__thumb__icons'>
            {platformIcons.map(p => (
              <div
                key={p}
                className='game-grid-item__thumb__icons__icon'
                style={{ backgroundImage: `url('${p}')` }} />
            ))}
          </div>
        </div>
      </div>
      <div className='game-grid-item__title' title={title}>
        <p className='game-grid-item__title__text'>{title}</p>
      </div>
    </li>
  );
}

export namespace GameGridItem {
  /** ID of the attribute used to store the game's id. */
  export const idAttribute = 'data-game-id';
  export const indexAttribute = 'data-game-index';
  export const logoPathAttribute = 'data-game-logo-path';
  export const screenshotPathAttribute = 'data-game-screenshot-path';

  /**
   * Get the id of the game displayed in a GameGridItem element (or throw an error if it fails).
   *
   * @param element GameGridItem element.
   */
  export function getDragEventData(element: Element): GameDragEventData {
    const gameId = element.getAttribute(GameGridItem.idAttribute);
    const index = num(element.getAttribute(GameGridItem.indexAttribute));
    const logoPath = element.getAttribute(GameGridItem.logoPathAttribute) || '';
    const screenshotPath = element.getAttribute(GameGridItem.screenshotPathAttribute) || '';
    if (typeof gameId !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return {
      gameId,
      index,
      logoPath,
      screenshotPath,
    };
  }

  /**
   * Check if an element is the top element of GameGridItem or not.
   *
   * @param element Potential element to check.
   */
  export function isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(GameGridItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
