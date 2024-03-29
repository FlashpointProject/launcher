import { num } from '@shared/utils/Coerce';
import * as React from 'react';
import { GridCellProps } from 'react-virtualized';
import { getPlatformIconURL } from '../Util';
import { GameDragEventData } from './pages/BrowsePage';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';

export type GameGridItemProps = Partial<GridCellProps> & {
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
  const [showScreenshot, setShowScreenshot] = React.useState(props.screenshotPreviewMode === ScreenshotPreviewMode.ALWAYS && (!props.extreme || !props.hideExtremeScreenshots));

  React.useEffect(() => {
    if (props.screenshotPreviewMode === ScreenshotPreviewMode.ON && (!props.extreme || !props.hideExtremeScreenshots)) {
      let timeoutId: any; // It's a timeout
      if (isHovered) {
        timeoutId = setTimeout(() => {
          setShowScreenshot(true);
          console.log('screenshot on');
        }, props.screenshotPreviewDelay); // Delay in milliseconds
      } else {
        setShowScreenshot(false);
        console.log('screenshot off');
      }
      return () => clearTimeout(timeoutId); // Cleanup timeout on component unmount or if hover state changes
    }
  }, [isHovered]);

  const { rowIndex, id, title, platforms, thumbnail, screenshot, extreme, isDraggable, isSelected, isDragged, extremeIconPath, style, onDrop } = props;
  // Get the platform icon path
  const platformIcons = React.useMemo(() =>
    platforms.slice(0, 5).map(p => getPlatformIconURL(p, props.logoVersion))
  , [platforms, props.logoVersion]);
  // Pick class names
  const className = React.useMemo(() => {
    let className = 'game-grid-item';
    if (isSelected) { className += ' game-grid-item--selected'; }
    if (isDragged)  { className += ' game-grid-item--dragged';  }
    return className;
  }, [isSelected, isDragged]);
  // Memoize render
  return React.useMemo(() => {
    // Set element attributes
    const attributes: any = {};
    attributes[GameGridItem.idAttribute] = id;
    attributes[GameGridItem.indexAttribute] = rowIndex;
    // Render
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
            style={{ backgroundImage: `url('${ showScreenshot ? screenshot : thumbnail }')` }}>
            {(extreme) ? (
              <div className='game-grid-item__thumb__icons--upper'>
                <div
                  className='game-grid-item__thumb__icons__icon'
                  style={{ backgroundImage: `url('${extremeIconPath}')` }} />
              </div>
            ) : undefined }
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
  }, [style, className, isDraggable, id, title, platformIcons, thumbnail, screenshot, showScreenshot]);
}

export namespace GameGridItem {
  /** ID of the attribute used to store the game's id. */
  export const idAttribute = 'data-game-id';
  export const indexAttribute = 'data-game-index';

  /**
   * Get the id of the game displayed in a GameGridItem element (or throw an error if it fails).
   *
   * @param element GameGridItem element.
   */
  export function getDragEventData(element: Element): GameDragEventData {
    const gameId = element.getAttribute(GameGridItem.idAttribute);
    const index = num(element.getAttribute(GameGridItem.indexAttribute));
    if (typeof gameId !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return {
      gameId,
      index
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
