import { BackOut, BackOutTemplate } from '@shared/back/types';
import { LOGOS, SCREENSHOTS, VIEW_PAGE_SIZE } from '@shared/constants';
import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, Grid, GridCellProps, ScrollIndices } from 'react-virtualized-reactv17';
import { UpdateView, ViewGameSet } from '../interfaces';
import { findElementAncestor, gameDragDataType, getExtremeIconURL, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { GameDragData, GameDragEventData } from './pages/BrowsePage';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';
import { GameLaunchOverride, TagFilter } from 'flashpoint-launcher';

const RENDERER_OVERSCAN = 5;

/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

type ColumnsRows = {
  columns: number;
  rows: number;
};

export type GameGridProps = {
  onGameLaunch: (gameId: string, override: GameLaunchOverride) => void;
  /** All games that will be shown in the grid (filter it before passing it here). */
  games: ViewGameSet;
  /** Total number of games in the results view there are. */
  resultsTotal?: number;
  /** Are we in a playlist view? */
  insideOrderedPlaylist: boolean;
  /** Currently selected game (if any). */
  selectedGameId?: string;
  /** Currently dragged game index (if any). */
  draggedGameIndex: number | null;
  /** Width of each cell in the grid (in pixels). */
  cellWidth: number;
  /** Height of each cell in the grid (in pixels). */
  cellHeight: number;
  /** List of Extreme tags */
  extremeTags: string[];
  /** Tag Filter icons */
  tagGroupIcons: { tagFilter: TagFilter; iconBase64: string; }[];
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onGameSelect: (gameId?: string, col?: number, row?: number) => void;
  /** Called when the user attempts to open a context menu (at a game). */
  onContextMenu?: (gameId: string) => void;
  /** Called when the user starts to drag a game. */
  onGameDragStart?: (event: React.DragEvent, dragEventData: GameDragEventData) => void;
  /** Called when the user stops dragging a game (when they release it). */
  onGameDragEnd?: (event: React.DragEvent) => void;
  /** Moves a game at the specified index above the other game at the destination index, inside the playlist */
  onMovePlaylistGame: (sourceGameId: string, destGameId: string) => void;
  updateView: UpdateView;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  gridRef?: RefFunc<HTMLDivElement>;
  /** Updates to clear platform icon cache */
  logoVersion: number;
  /** Screenshot Preview Mode */
  screenshotPreviewMode: ScreenshotPreviewMode;
  /** Screenshot Preview Delay */
  screenshotPreviewDelay: number;
  /** Hide extreme screenshots */
  hideExtremeScreenshots: boolean;
  /** View id */
  viewId?: string;
  /** Scroll position */
  scrollCol?: number;
  scrollRow?: number;
  scrollTop?: number;
  onScrollChange?: (scrollTop: number) => void;
  onScrollToChange?: (params: ScrollIndices, columns: number) => void;
};

type GameGridState = {
  forceScrollTop?: number;
  scrollTop?: number;
}

/** A grid of cells, where each cell displays a game. */
export class GameGrid extends React.Component<GameGridProps, GameGridState> {
  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();
  /** Most recently reference passed to the "gridRef" callback prop. */
  prevWrapperRef: HTMLDivElement | null = null;
  /** Number of columns in the grid from the most recent render. */
  columns = 0;
  /** Current value of the "width" css variable. */
  currentWidth = 0;
  /** Current value of the "height" css variable. */
  currentHeight = 0;
  /** Currently displayed games. */
  currentGames: ViewGameSet | undefined;
  currentGamesCount = 0;
  // Used for the "view update hack"
  grid: React.RefObject<Grid> = React.createRef();

  constructor(props: GameGridProps) {
    super(props);
    this.state = {
      forceScrollTop: props.scrollTop,
    };
  }

  componentDidMount(): void {
    window.Shared.back.registerAny(this.onResponse);
    this.updateCssVars();
    this.updatePropRefs();
  }

  componentDidUpdate(prevProps: GameGridProps): void {
    if (this.props.viewId !== prevProps.viewId) {
      this.setState({
        forceScrollTop: this.props.scrollTop,
      });
    }
    this.updateCssVars();
    this.updatePropRefs();

    // Clear forced scrollTop after use
    if (this.state.forceScrollTop !== undefined) {
      this.setState({
        forceScrollTop: undefined
      });
    }

    // @HACK: Update the view in cases where the "onSectionRendered" callback is not called _EVEN THOUGH_ the cells have been re-rendered
    //        (Such as when changing library without making it scroll)
    // Note: This has a side effect of sometimes requesting the same pages twice (I think? //obelisk)
    const grid = this.grid.current;
    if (grid) {
      const start = (grid as any)._rowStartIndex;
      const stop = (grid as any)._rowStopIndex;

      if (typeof start === 'number' && typeof stop === 'number') {
        this.updateView(start, stop, this.columns);
      } else {
        console.warn('Failed to check if the grid view has been updated. The private properties extracted from "Grid" was of an unexpected type.');
      }
    }
  }

  componentWillUnmount(): void {
    if (this.props.onScrollChange && this.state.scrollTop !== undefined) {
      this.props.onScrollChange(this.state.scrollTop);
    }
    window.Shared.back.unregisterAny(this.onResponse);
  }

  onGameDrop = (event: React.DragEvent) => {
    const rawData = event.dataTransfer.getData(gameDragDataType);
    if (rawData) {
      const dragData = JSON.parse(rawData) as GameDragData;
      console.log(`source: ${dragData.index}`);
      const destData = this.findGameDragEventData(event.target);
      if (destData) {
        console.log(`dest: ${destData.index}`);
        // Move the dropped game above the target game in the playlist
        this.props.onMovePlaylistGame(dragData.gameId, destData.gameId);
      }
    }
  };

  onGameDragOver = (event: React.DragEvent): void => {
    const types = event.dataTransfer.types;
    if (types.length === 1 && types[0] === gameDragDataType) {
      // Show the "You can drop here" cursor while dragging something droppable over this element
      event.dataTransfer.dropEffect = 'copy';
      event.preventDefault();
    }
  };

  render() {
    const games = this.props.games || [];
    // @HACK: Check if the games array changed
    // (This will cause the re-rendering of all cells any time the games prop uses a different reference)
    if (games !== this.currentGames) {
      this.currentGames = games;
      this.currentGamesCount = (this.currentGamesCount + 1) % 100;
    }

    // Render
    return (
      <GameItemContainer
        className='game-browser__center-inner'
        onGameSelect={this.onGameSelect}
        onGameLaunch={this.onGameLaunch}
        onGameContextMenu={this.onGameContextMenu}
        onGameDragStart={this.onGameDragStart}
        onGameDragEnd={this.onGameDragEnd}
        onGameDrop={this.props.insideOrderedPlaylist ? this.onGameDrop : undefined}
        onGameDragOver={this.props.insideOrderedPlaylist ? this.onGameDragOver : undefined}
        findGameDragEventData={this.findGameDragEventData}
        realRef={this.wrapperRef}
        onKeyPress={this.onKeyPress}>
        <AutoSizer>
          {({ width, height }) => {
            const { columns, rows } = this.calculateSize(this.props.resultsTotal || 0, width);
            this.columns = columns;
            // Render
            return (
              <ArrowKeyStepper
                onScrollToChange={this.onScrollToChange}
                mode='cells'
                isControlled={true}
                columnCount={columns}
                rowCount={rows}
                scrollToColumn={this.props.scrollCol}
                scrollToRow={this.props.scrollRow}>
                {({ onSectionRendered }) => {
                  return (
                    <Grid
                      className='game-grid simple-scroll'
                      ref={this.grid}
                      // Grid stuff
                      width={width}
                      height={height}
                      columnWidth={this.props.cellWidth}
                      rowHeight={this.props.cellHeight}
                      columnCount={columns}
                      rowCount={rows}
                      overscanColumnCount={0}
                      overscanRowCount={RENDERER_OVERSCAN}
                      cellRenderer={this.cellRenderer}
                      noContentRenderer={this.props.noRowsRenderer}
                      // ArrowKeyStepper props
                      scrollToColumn={this.props.scrollCol}
                      scrollToRow={this.props.scrollRow}
                      scrollTop={this.state.forceScrollTop}
                      onScroll={(params) => {
                        this.setState({
                          scrollTop: params.scrollTop
                        })
                      }}
                      onSectionRendered={(params) => this.onSectionRendered(params, columns, onSectionRendered)}
                      // Pass-through props (they have no direct effect on the grid)
                      // (If any property is changed the grid is re-rendered, even these)
                      pass_currentGamesCount={this.currentGamesCount}
                      pass_viewId={this.props.viewId} />
                  );
                }}
              </ArrowKeyStepper>
            );
          }}
        </AutoSizer>
      </GameItemContainer>
    );
  }

  // Renders a single cell in the game grid.
  cellRenderer = (props: GridCellProps): React.ReactNode => {
    const extremeIconPath = this.extremeIconPathMemo(this.props.logoVersion);
    const { games, resultsTotal, selectedGameId } = this.props;
    const index = props.rowIndex * this.columns + props.columnIndex;
    if (index < (resultsTotal || 0)) {
      const game = games[index];
      const tagGroupIcon = this.props.tagGroupIcons.find(tg => tg.tagFilter.find(t => game?.tags.includes(t)))?.iconBase64;
      return (
        <GameGridItem
          { ...props }
          key={props.key}
          id={game ? game.id : ''}
          title={game ? game.title : ''}
          platforms={game ? [game.primaryPlatform] : []}
          extreme={game ? game.tags.findIndex(t => this.props.extremeTags.includes(t.trim())) !== -1 : false}
          extremeIconPath={extremeIconPath}
          tagGroupIconBase64={tagGroupIcon || ''}
          thumbnail={game ? getGameImageURL(LOGOS, game.id) : ''}
          screenshot={game ? getGameImageURL(SCREENSHOTS, game.id) : ''}
          screenshotPreviewMode={this.props.screenshotPreviewMode}
          screenshotPreviewDelay={this.props.screenshotPreviewDelay}
          logoVersion={this.props.logoVersion}
          hideExtremeScreenshots={this.props.hideExtremeScreenshots}
          isDraggable={true}
          isSelected={game ? game.id === selectedGameId : false}
          isDragged={false} /> // Bugged render update
      );
    } else {
      return undefined;
    }
  };

  onResponse: Parameters<typeof window.Shared.back.registerAny>[0] = (event, type, args) => {
    if (type === BackOut.IMAGE_CHANGE) {
      const [ folder, id ] = args as Parameters<BackOutTemplate[typeof type]>;

      // Update the image in the browsers cache
      if (folder === LOGOS) {
        fetch(getGameImageURL(folder, id))
        .then(() => {
          // Refresh the image for the game(s) that uses it
          const elements = document.getElementsByClassName('game-grid-item');
          for (let i = 0; i < elements.length; i++) {
            const item = elements.item(i);
            if (item && GameGridItem.getDragEventData(item).gameId === id) {
              const img: HTMLElement | null = item.querySelector('.game-grid-item__thumb__image') as any;
              if (img) {
                const val = img.style.backgroundImage;
                img.style.backgroundImage = '';
                img.style.backgroundImage = val;
              }
            }
          }
        })
        .catch((err) => {
          log.error('Launcher', 'Error fetching new image url ' + err);
        });
      }
    }
  };

  onSectionRendered = (params: any, columns: number, callback?: (params: any) => void) => {
    if (callback) { callback(params); }
    this.updateView(params.rowOverscanStartIndex, params.rowOverscanStopIndex, columns);
  };

  // When a key is pressed (while the grid, or one of its children, is selected).
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedGameId) {
        this.props.onGameLaunch(this.props.selectedGameId, null);
      }
    }
  };

  /**
   * When a cell is clicked.
   *
   * @param event React event
   * @param gameId ID of pressed Game
   */
  onGameSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    const index: number = findGameIndex(this.props.games, gameId);
    if (index >= 0) {
      const col = index % this.columns;
      const row = (index / this.columns) | 0;
      this.props.onGameSelect(gameId, col, row);
    }
  };

  /**
   * When a cell is double clicked.
   *
   * @param event React event
   * @param gameId ID of Game to launch
   */
  onGameLaunch = (event: React.MouseEvent, gameId: string): void => {
    this.props.onGameLaunch(gameId, null);
  };

  /**
   * When a cell is right clicked.
   *
   * @param event React event
   * @param gameId ID of Game to open context menu for
   */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined): void => {
    if (this.props.onContextMenu) {
      if (gameId) { this.props.onContextMenu(gameId); }
    }
  };

  /**
   * When a cell is starting to be dragged.
   *
   * @param event React event
   * @param dragEventData Data of the cell to be dragged
   */
  onGameDragStart = (event: React.DragEvent, dragEventData: GameDragEventData): void => {
    if (this.props.onGameDragStart) {
      this.props.onGameDragStart(event, dragEventData);
    }
  };

  /**
   * When a cell is ending being dragged.
   *
   * @param event React event
   */
  onGameDragEnd = (event: React.DragEvent): void => {
    if (this.props.onGameDragEnd) {
      this.props.onGameDragEnd(event);
    }
  };

  /**
   * When a cell is selected.
   *
   * @param params Position params to scroll to
   */
  onScrollToChange = (params: ScrollIndices): void => {
    if (this.props.onScrollToChange) {
      this.props.onScrollToChange(params, this.columns);
    }
  };

  // Find a game's ID.
  findGameDragEventData = (element: EventTarget): GameDragEventData | undefined => {
    const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
    if (game) { return GameGridItem.getDragEventData(game); }
  };

  /** Update CSS Variables. */
  updateCssVars() {
    const wrapper = this.wrapperRef.current;
    if (!wrapper) { throw new Error('Browse Page wrapper div not found'); }
    // Update width (if it changed)
    if (this.currentWidth !== this.props.cellWidth) {
      this.currentWidth = this.props.cellWidth;
      wrapper.style.setProperty('--width', this.currentWidth+'');
    }
    // Update height (if it changed)
    if (this.currentHeight !== this.props.cellHeight) {
      this.currentHeight = this.props.cellHeight;
      wrapper.style.setProperty('--height', this.currentHeight+'');
    }
  }

  /**
   * Call the "ref" property functions.
   * Do this whenever there's a possibility that the referenced elements has been replaced.
   */
  updatePropRefs(): void {
    if (this.props.gridRef) {
      // Find the grid element
      let ref: HTMLDivElement | null = null;
      if (this.wrapperRef.current) {
        const inner = this.wrapperRef.current.querySelector('.game-grid');
        if (inner) { ref = inner as HTMLDivElement; }
      }
      // Call callback
      if (ref !== this.prevWrapperRef) {
        this.prevWrapperRef = ref;
        this.props.gridRef(ref);
      }
    }
  }

  calculateSize(resultsTotal: number, width: number): ColumnsRows {
    // Calculate and set column/row count
    // (16 is the width of a scroll-bar in pixels - at least on windows)
    const cells: ColumnsRows = {
      columns: 0,
      rows: 0,
    };
    if (resultsTotal > 0) {
      cells.columns = Math.max(1, ((width - 16) / this.props.cellWidth) | 0); // ("x|0" is the same as Math.floor(x))
      cells.rows = Math.ceil(resultsTotal / cells.columns);
    }
    return cells;
  }

  updateView(start: number, stop: number, columns: number): void {
    const trailingPage = Math.floor((start * columns) / VIEW_PAGE_SIZE);
    const leadingPage  = Math.floor((stop  * columns) / VIEW_PAGE_SIZE);

    this.props.updateView(trailingPage, (leadingPage - trailingPage) + 2);
  }

  extremeIconPathMemo = memoizeOne((logoVersion: number) => {
    return getExtremeIconURL(logoVersion);
  });
}

function findGameIndex(games: ViewGameSet | undefined, gameId: string | undefined): number {
  if (gameId !== undefined && games) {
    for (const index in games) {
      const game = games[index];
      if (game && game.id === gameId) { return (index as any) | 0; }
    }
  }
  return -1;
}
