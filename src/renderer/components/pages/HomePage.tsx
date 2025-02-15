import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { WithMainStateProps } from '@renderer/containers/withMainState';
import { BackIn, ComponentStatus, GameOfTheDay } from '@shared/back/types';
import { ARCADE, LOGOS, SCREENSHOTS, THEATRE } from '@shared/constants';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { DialogState, Game, GameLaunchOverride, Playlist, ViewGame } from 'flashpoint-launcher';
import * as React from 'react';
import ReactDatePicker from 'react-datepicker';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { Paths } from '@shared/Paths';
import { findGameDragEventDataGrid, getExtremeIconURL, getGameImageURL, getPlatformIconURL, joinLibraryRoute } from '../../Util';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { LangContext } from '../../util/lang';
import { GameGridItem } from '../GameGridItem';
import { GameItemContainer } from '../GameItemContainer';
import { HomePageBox } from '../HomePageBox';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { RandomGames } from '../RandomGames';
import { SimpleButton } from '../SimpleButton';
import { SizeProvider } from '../SizeProvider';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import { idToGame } from '@renderer/util/async';
import { useView } from '@renderer/hooks/search';

type OwnProps = {
  gotdList: GameOfTheDay[] | undefined;
  platforms: string[];
  playlists: Playlist[];
  /** Generator for game context menu */
  onGameContextMenu: (gameId: string) => void;
  onLaunchGame: (gameId: string, override: GameLaunchOverride) => void;
  /** Pass to Random Picks */
  randomGames: ViewGame[];
  /** Re-rolls the Random Games */
  rollRandomGames: () => void;
  /** Update to clear platform icon cache */
  logoVersion: number;
  /** Raw HTML of the Update page grabbed */
  updateFeedMarkdown: string;
  selectedGameId?: string;
  /** List of components from FPM */
  componentStatuses: ComponentStatus[];
  openFlashpointManager: () => void;
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithSearchProps & WithMainStateProps;

export function HomePage(props: HomePageProps) {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  const logoDelay = React.useMemo(() => (Date.now() * -0.001) + 's', []);
  const [updating, setUpdating] = React.useState(false);

  const parsedGotdList = React.useMemo(() => {
    return props.gotdList ? props.gotdList.map(g => {
      const parts = g.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const newDate = new Date(year, month - 1, day);
      return {
        ...g,
        date: newDate
      };
    }).sort((a, b) => { return a.date.getTime() - b.date.getTime(); }) : [];
  }, [props.gotdList]);

  const [selectedGotd, setSelectedGotd] = React.useState(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const filteredList = window.Shared.config.data.gotdShowAll ? parsedGotdList : parsedGotdList.filter(g => g.date < today);
    const todaysGame = filteredList.find(g => (g.date > yesterday && g.date < today));
    if (todaysGame) {
      // Found todays game
      return todaysGame;
    } else {
      if (filteredList.length >= 1) {
        const nextGameIndex = filteredList.findIndex(g => g.date > today);
        if (nextGameIndex > 0) {
          // Found game closest to today, going backwards in time
          return filteredList[nextGameIndex - 1];
        } else {
          // No GOTD entries before today, just grab the first one on the list
          return filteredList[0];
        }
      }
    }
  });

  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  const toggleMinimizeBox = React.useCallback((cssKey: string) => {
    const newBoxes = [...props.preferencesData.minimizedHomePageBoxes];
    const idx = newBoxes.findIndex(s => s === cssKey);
    if (idx === -1) {
      newBoxes.push(cssKey);
    } else {
      newBoxes.splice(idx, 1);
    }
    updatePreferencesData({
      minimizedHomePageBoxes: newBoxes
    });
  }, [props.preferencesData.minimizedHomePageBoxes]);

  const onGameSelect = async (gameId: string | undefined) => {
    if (gameId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, gameId);
      if (game) {
        props.searchActions.selectGame({
          view: GENERAL_VIEW_ID,
          game
        });
      }
    }
  };

  const onLaunchGame = React.useCallback((gameId: string) => {
    props.onLaunchGame(gameId, null);
  }, [props.onLaunchGame]);

  const onHallOfFameClick = React.useCallback(() => {
    const playlist = props.playlists.find(p => p.title.toLowerCase().includes('hall of fame'));
    if (playlist) {
      // TODO: Reimplement
    }
  }, [props.playlists]);

  const onFavoriteClick = React.useCallback(() => {
    const playlist = props.playlists.find(p => p.title === ' Favorites' || p.title === '*Favorites*');
    if (playlist) {
      // TODO: Reimplement
    }
  }, [props.playlists]);

  // const onHistoryClick = React.useCallback(() => {
  //   updatePreferencesData({
  //     gamesOrderBy: 'lastPlayed',
  //     gamesOrder: 'DESC',
  //   });
  //   props.onSelectPlaylist(ARCADE, null);
  //   props.clearSearch();
  // }, [props.onSelectPlaylist, props.clearSearch]);

  const onAllGamesClick = React.useCallback(() => {
    // TODO: Reimplement
  }, []);

  const onAllAnimationsClick = React.useCallback(() => {
    // TODO: Reimplement
  }, []);

  const currentView = useView();

  const platformList = React.useMemo(() => {
    const elements: JSX.Element[] = [];
    const views = Object.keys(props.search.views);
    let viewName = '';
    for (const view of views) {
      if (view !== GENERAL_VIEW_ID) {
        viewName = view;
        break;
      }
    }
    const sortedPlatforms = [...props.platforms].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    elements.push(
      <div className='home-page__platform-box'>
        {sortedPlatforms.map((platform, idx) => (
          <Link
            key={idx}
            className='home-page__platform-entry'
            to={joinLibraryRoute(viewName)}
            onClick={() => {
              props.searchActions.setSearchText({
                view: viewName,
                text: `platform:"${platform}"`
              });
              setTimeout(() => {
                props.searchActions.forceSearch({
                  view: viewName
                });
              }, 100);
            }}>
            <div
              className='home-page__platform-entry__logo'
              style={{ backgroundImage: `url("${getPlatformIconURL(platform, props.logoVersion)}")` }}/>
            <div className='home-page__platform-entry__text'>{platform}</div>
          </Link>
        )
        )}
      </div>
    );
    return elements;
  }, [props.platforms, props.search.views]);

  // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
  const height = 140;
  const width: number = (height * 0.666) | 0;

  const renderedQuickStart = React.useMemo(() => {
    const render = (
      <>
        <QuickStartItem icon='badge'>
          {formatString(strings.hallOfFameInfo, <Link to={joinLibraryRoute(ARCADE)} onClick={onHallOfFameClick}>{strings.hallOfFame}</Link>)}
        </QuickStartItem><QuickStartItem icon='play-circle'>
          {formatString(strings.allGamesInfo, <Link to={joinLibraryRoute(ARCADE)} onClick={onAllGamesClick}>{strings.allGames}</Link>)}
        </QuickStartItem><QuickStartItem icon='video'>
          {formatString(strings.allAnimationsInfo, <Link to={joinLibraryRoute(THEATRE)} onClick={onAllAnimationsClick}>{strings.allAnimations}</Link>)}
        </QuickStartItem><QuickStartItem icon='wrench'>
          {formatString(strings.configInfo, <Link to={Paths.CONFIG}>{strings.config}</Link>)}
        </QuickStartItem>
        <QuickStartItem icon='info'>
          {formatString(strings.helpInfo, <Link to={Paths.MANUAL}>{strings.help}</Link>)}
        </QuickStartItem>
      </>
    );
    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('quickStart')}
        cssKey={'quickStart'}
        title={strings.quickStartHeader}
        onToggleMinimize={() => toggleMinimizeBox('quickStart')}>
        {render}
      </HomePageBox>
    );
  }, [strings, onHallOfFameClick, onAllGamesClick, onAllAnimationsClick, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedExtras = React.useMemo(() => {
    const render = (
      <>
        <QuickStartItem icon='puzzle-piece'>
          {strings.filterByPlatform}:
        </QuickStartItem>
        <QuickStartItem className='home-page__box-item--platforms'>
          {platformList}
        </QuickStartItem><br />
      </>
    );

    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('extras')}
        cssKey={'extras'}
        title={strings.extrasHeader}
        onToggleMinimize={() => toggleMinimizeBox('extras')}>
        {render}
      </HomePageBox>
    );
  }, [strings, onFavoriteClick, platformList, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedNotes = React.useMemo(() => {
    const render = (
      <QuickStartItem>
        {strings.notes}
      </QuickStartItem>
    );
    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('notes')}
        title={strings.notesHeader}
        cssKey='notes'
        onToggleMinimize={() => toggleMinimizeBox('notes')}>
        {render}
      </HomePageBox>
    );
  }, [strings, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const tagGroupIcons = props.preferencesData.tagFilters.filter(t => !t.enabled && t.iconBase64 !== '').map(({tags, iconBase64: tagGroupIcon}) => ({tagFilter:tags, iconBase64:tagGroupIcon}));

  const renderedRandomGames = React.useMemo(() => (
    <SizeProvider width={width} height={height}>
      <RandomGames
        games={props.randomGames}
        rollRandomGames={props.rollRandomGames}
        onGameContextMenu={props.onGameContextMenu}
        onLaunchGame={onLaunchGame}
        onGameSelect={onGameSelect}
        extremeTags={props.preferencesData.tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), [])}
        tagGroupIcons={tagGroupIcons}
        logoVersion={props.logoVersion}
        selectedGameId={props.selectedGameId}
        screenshotPreviewMode={props.preferencesData.screenshotPreviewMode}
        screenshotPreviewDelay={props.preferencesData.screenshotPreviewDelay}
        hideExtremeScreenshots={props.preferencesData.hideExtremeScreenshots}
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('random-games')}
        onToggleMinimize={() => toggleMinimizeBox('random-games')} />
    </SizeProvider>
  ), [strings, props.onGameContextMenu, props.selectedGameId, props.logoVersion, props.preferencesData.tagFilters, props.randomGames, onLaunchGame, props.rollRandomGames, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const [loadedGotd, setLoadedGotd] = React.useState<Game | null>(null);
  React.useEffect(() => {
    if (selectedGotd) {
      window.Shared.back.request(BackIn.GET_GAME, selectedGotd.id)
      .then((game) => {
        if (game) {
          setLoadedGotd(game);
        }
      });
    }
  }, [selectedGotd]);

  const onSelectGame = async (gameId: string) => {
    const game = await idToGame(gameId);
    if (game) {
      props.searchActions.selectGame({
        view: GENERAL_VIEW_ID,
        game,
      });
    }
  };

  const extremeIconPath = React.useMemo(() => getExtremeIconURL(props.logoVersion), [props.logoVersion]);

  const renderedGotd = React.useMemo(() => {
    if (props.gotdList === undefined) {
      return <></>; // No GOTD to display yet
    }
    const extremeTags = props.preferencesData.tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('gotd')}
        title={strings.gotdHeader}
        cssKey='gotd'
        onToggleMinimize={() => toggleMinimizeBox('gotd')}>
        <SizeProvider width={width} height={height}>
          { selectedGotd ? <div className='home-page__box-item--gotd'>
            <div className='home-page__box-item--gotd-left'>
              { loadedGotd ? (
                <GameItemContainer
                  className='gotd-container'
                  onGameContextMenu={(event, gameId) => props.onGameContextMenu(gameId)}
                  onGameSelect={(event, gameId) => gameId && onSelectGame(gameId)}
                  onGameLaunch={(event, gameId) => props.onLaunchGame(gameId, null)}
                  findGameDragEventData={findGameDragEventDataGrid}>
                  <GameGridItem
                    key={loadedGotd.id}
                    id={loadedGotd.id}
                    title={loadedGotd.title}
                    platforms={loadedGotd.platforms.map(p => p.trim())}
                    extreme={loadedGotd.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1}
                    extremeIconPath={extremeIconPath}
                    tagGroupIconBase64={tagGroupIcons.find(tg => tg.tagFilter.find(t => loadedGotd?.tags.includes(t)))?.iconBase64 || ''}
                    thumbnail={getGameImageURL(LOGOS, loadedGotd.id)}
                    screenshot={getGameImageURL(SCREENSHOTS, loadedGotd.id)}
                    screenshotPreviewMode={props.preferencesData.screenshotPreviewMode}
                    screenshotPreviewDelay={props.preferencesData.screenshotPreviewDelay}
                    hideExtremeScreenshots={props.preferencesData.hideExtremeScreenshots}
                    logoVersion={props.logoVersion}
                    isDraggable={true}
                    isSelected={loadedGotd.id === props.selectedGameId}
                    isDragged={false} />
                </GameItemContainer>
              ) : (
                <div className='game-grid-item'></div>
              )}
            </div>
            <div className='home-page__box-item--gotd-right'>
              <div className='home-page__box-item--gotd-author'><b>Suggested By:</b> {selectedGotd.author || 'Anonymous'}</div>
              <div className='home-page__box-item--gotd-desc'>{selectedGotd.description}</div>
              <div className='home-page__box-item--gotd-date'>
                <ReactDatePicker
                  dateFormat="yyyy-MM-dd"
                  selected={new Date(selectedGotd.date)}
                  includeDates={parsedGotdList.filter(g => window.Shared.config.data.gotdShowAll || g.date.getTime() < Date.now()).map(g => new Date(g.date))}
                  onChange={(date) => {
                    if (date) {
                      const newGotd = parsedGotdList.find(g => g.date.toDateString() === date.toDateString());
                      if (newGotd) {
                        setSelectedGotd(newGotd);
                      }
                    }
                  }}
                  customInput={
                    <SimpleButton/>
                  }>
                </ReactDatePicker>
              </div>
            </div>
          </div> : 'None Found' }
        </SizeProvider>
      </HomePageBox>
    );
  }, [parsedGotdList, props.selectedGameId, extremeIconPath, loadedGotd, props.preferencesData.minimizedHomePageBoxes, selectedGotd]);

  const renderedNewsFeed = React.useMemo(() => {
    if (props.updateFeedMarkdown) {
      const markdownRender =
        <ReactMarkdown remarkPlugins={[remarkGfm]} linkTarget={'_blank'}>
          {props.updateFeedMarkdown}
        </ReactMarkdown>;
      return (
        <HomePageBox
          minimized={props.preferencesData.minimizedHomePageBoxes.includes('updateFeed')}
          title={strings.updateFeedHeader}
          cssKey='updateFeed'
          onToggleMinimize={() => toggleMinimizeBox('updateFeed')}>
          {markdownRender}
        </HomePageBox>
      );
    }
  }, [strings, props.updateFeedMarkdown, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedMetadataUpdate = React.useMemo(() => {
    const onPressUpdate = () => {
      if (updating) {
        return;
      }
      setUpdating(true);

      if (props.main.metadataUpdate.total <= 0) {
        // Fetch update info
        window.Shared.back.request(BackIn.PRE_UPDATE_INFO, props.preferencesData.gameMetadataSources[0])
        .then((total) => {
          props.mainActions.setUpdateInfo(total);
        })
        .finally(() => {
          setUpdating(false);
        });
      } else {
        // Do update
        window.Shared.back.request(BackIn.SYNC_ALL, props.preferencesData.gameMetadataSources[0])
        .then((success) => {
          if (success) {
            const dialog: DialogState = {
              largeMessage: true,
              message: strings.updateComplete,
              buttons: [allStrings.misc.ok],
              id: uuid()
            };
            props.mainActions.createDialog(dialog);
            props.mainActions.setUpdateInfo(0);
          }
        })
        .catch((err) => {
          log.error('Launcher', `Error updating metadata: ${err}`);
          const dialog: DialogState = {
            largeMessage: true,
            message: `ERROR: ${err}`,
            buttons: [allStrings.misc.ok],
            id: uuid()
          };
          props.mainActions.createDialog(dialog);
        })
        .finally(() => {
          setUpdating(false);
        });
      }
    };

    if (props.preferencesData.gameMetadataSources.length > 0) {
      const text = props.main.metadataUpdate.ready ? (
        props.main.metadataUpdate.total > 0 ? strings.update :
          props.main.metadataUpdate.total === -1 ? strings.error : strings.checkForUpdates
      ) : strings.checkingUpdate;
      return (
        <div className='update-metadata-box'>
          <div className='update-metadata-button'>
            <SimpleButton
              className='update-metadata-button-inner'
              value={text}
              disabled={updating}
              onClick={onPressUpdate} />
          </div>
          <div className='update-metadata-name'>
            {props.preferencesData.gameMetadataSources[0].name}
          </div>
          { props.main.metadataUpdate.ready && props.main.metadataUpdate.total > 0 && (
            <div className='update-metadata-last'>
              {formatString(strings.updatedGamesReady, (props.main.metadataUpdate.total + 1).toString())}
            </div>
          )}
          <div className='update-metadata-last'>
            {`${strings.lastUpdated}: ${(new Date(props.preferencesData.gameMetadataSources[0].games.actualUpdateTime)).toLocaleString()}`}
          </div>
        </div>
      );
    } else {
      return (<></>);
    }

  }, [strings, props.preferencesData.gameMetadataSources, props.main.metadataUpdate, updating]);

  // Render
  return React.useMemo(() => (
    <div className='home-page simple-scroll'>
      <div className='home-page__inner'>
        {/* Logo */}
        <div className='home-page__logo fp-logo-box'>
          {/* Metadata Update */}
          { props.preferencesData.gameMetadataSources.length > 0 && renderedMetadataUpdate }
          <FancyAnimation
            fancyRender={() => (
              <div
                className='fp-logo fp-logo--animated'
                style={{ animationDelay: logoDelay }} />
            )}
            normalRender={() => (
              <div className='fp-logo'/>
            )}/>
        </div>
        {/* News Feed */}
        { renderedNewsFeed }
        {/* Game of the Day */}
        { renderedGotd }
        {/* Quick Start */}
        { renderedQuickStart }
        {/* Notes */}
        { renderedNotes }
        {/* Random Games */}
        { renderedRandomGames }
        {/* Extras */}
        { renderedExtras }
      </div>
    </div>
  ), [renderedQuickStart, renderedExtras, renderedNotes, renderedRandomGames, renderedNewsFeed,
    renderedGotd, renderedMetadataUpdate]);
}

function QuickStartItem(props: { icon?: OpenIconType, className?: string, children?: React.ReactNode }): JSX.Element {
  return (
    <li className={'home-page__box-item simple-center ' + (props.className||'')}>
      { props.icon ? (
        <div className='home-page__box-item-icon'>
          <OpenIcon icon={props.icon} />
        </div>
      ) : undefined }
      <div className='simple-center__vertical-inner'>
        {props.children}
      </div>
    </li>
  );
}
