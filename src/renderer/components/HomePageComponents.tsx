import { createSelector } from '@reduxjs/toolkit';
import { useView } from '@renderer/hooks/search';
import { addRandomGames, RANDOM_GAME_ROW_COUNT, setMainState } from '@renderer/store/main/slice';
import { GENERAL_VIEW_ID, searchActions, selectGame } from '@renderer/store/search/slice';
import { RootState } from '@renderer/store/store';
import { findGameDragEventDataGrid, getExtremeIconURL, getGameImageURL, getPlatformIconURL, joinLibraryRoute } from '@renderer/Util';
import { idToGame } from '@renderer/util/async';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { ARCADE, THEATRE } from '@shared/constants';
import { Paths } from '@shared/Paths';
import { isGame } from '@shared/utils/misc';
import { formatString } from '@shared/utils/StringFormatter';
import { Content, Game } from 'flashpoint-launcher';
import { HomePageComponentProps } from 'flashpoint-launcher-renderer';
import React, { useEffect, useMemo, useRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { HomePageBox } from './HomePageBox';
import { OpenIcon, OpenIconType } from './OpenIcon';
import { RandomGames } from './RandomGames';
import { SimpleButton } from './SimpleButton';
import { SizeProvider } from './SizeProvider';

const selectMinimizedFactory = (boxKey: string) => {
  return createSelector(
    [(state: RootState) => state.preferences.minimizedHomePageBoxes],
    (boxes) => boxes.includes(boxKey)
  );
};

const selectUpdateFeedMinimized = selectMinimizedFactory('updateFeed');

export function HomePageComponentUpdateFeed(props: HomePageComponentProps) {
  const { toggleMinimizeBox } = props;
  const minimized = window.ext.hooks.useAppSelector(selectUpdateFeedMinimized);
  const updateFeedMarkdown = window.ext.hooks.useAppSelector(state => state.main.updateFeedMarkdown);
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  if (updateFeedMarkdown) {
    return (
      <HomePageBox
        minimized={minimized}
        title={strings.updateFeedHeader}
        cssKey='updateFeed'
        onToggleMinimize={() => toggleMinimizeBox('updateFeed', minimized)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} linkTarget={'_blank'}>
          {updateFeedMarkdown}
        </ReactMarkdown>
      </HomePageBox>
    );
  } else {
    return <></>;
  }
}

// (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
const height = 140;
const width: number = (height * 0.666) | 0;

export function HomePageComponentGotd(props: HomePageComponentProps) {
  const { toggleMinimizeBox } = props;
  const gotdList = window.ext.hooks.useAppSelector(state => state.main.gotdList);
  const logoVersion = window.ext.hooks.useAppSelector(state => state.main.logoVersion);
  const tagFilters = window.ext.hooks.useAppSelector(state => state.preferences.tagFilters);
  const minimized = window.ext.hooks.useAppSelector(state => state.preferences.minimizedHomePageBoxes.includes('gotd'));
  const screenshotPreviewMode = window.ext.hooks.useAppSelector(state => state.preferences.screenshotPreviewMode);
  const screenshotPreviewDelay = window.ext.hooks.useAppSelector(state => state.preferences.screenshotPreviewDelay);
  const hideExtremeScreenshots = window.ext.hooks.useAppSelector(state => state.preferences.hideExtremeScreenshots);
  const view = useView();
  const dispatch = window.ext.hooks.useAppDispatch();
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;
  const extremeTags = tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

  const getContentIcons = (game: Content | Game) => {
    return isGame(game) ? game.platforms.slice(0, 5).map(p => getPlatformIconURL(p, logoVersion)) : [];
  };

  const onSelectGame = async (gameId: string) => {
    const game = await idToGame(gameId);
    if (game) {
      dispatch(selectGame({
        view: GENERAL_VIEW_ID,
        game,
      }));
    }
  };

  const parsedGotdList = gotdList ? gotdList.map(g => {
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

  const [loadedGotd, setLoadedGotd] = React.useState<Game | null>(null);
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

  const extreme = loadedGotd?.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1;
  // eslint-disable-next-line react-hooks/purity
  const currentDate = useMemo(() => Date.now(), []);
  const includedPickerDates = parsedGotdList.filter(g => window.Shared.config.data.gotdShowAll || g.date.getTime() < currentDate).map(g => new Date(g.date));

  if (gotdList) {
    <HomePageBox
      minimized={minimized}
      title={strings.gotdHeader}
      cssKey='gotd'
      onToggleMinimize={() => toggleMinimizeBox('gotd', minimized)}>
      <SizeProvider width={width} height={height}>
        { selectedGotd ? <div className='home-page__box-item--gotd'>
          <div className='home-page__box-item--gotd-left'>
            { loadedGotd ? (
              <GameItemContainer
                className='gotd-container'
                onGameContextMenu={props.onGameContextMenu}
                onContentSelect={(event, gameId) => gameId && onSelectGame(gameId)}
                onContentLaunch={(event, gameId) => props.onLaunchGame(gameId)}
                findGameDragEventData={findGameDragEventDataGrid}>
                <GameGridItem
                  game={loadedGotd}
                  key={loadedGotd.id}
                  id={loadedGotd.id}
                  title={loadedGotd.title}
                  upperIcons={extreme ? [getExtremeIconURL(logoVersion)] : []}
                  lowerIcons={getContentIcons(loadedGotd)}
                  extreme={extreme}
                  thumbnail={getGameImageURL(loadedGotd.logoPath)}
                  screenshot={getGameImageURL(loadedGotd.screenshotPath)}
                  screenshotPreviewMode={screenshotPreviewMode}
                  screenshotPreviewDelay={screenshotPreviewDelay}
                  hideExtremeScreenshots={hideExtremeScreenshots}
                  logoVersion={logoVersion}
                  isDraggable={true}
                  isSelected={loadedGotd.id === view.selectedGame?.id}
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
                includeDates={includedPickerDates}
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
    </HomePageBox>;
  } else {
    return <></>;
  }
}

export function HomePageComponentQuickStart(props: HomePageComponentProps) {
  const { toggleMinimizeBox } = props;
  const playlists = window.ext.hooks.useAppSelector(state => state.main.playlists);
  const minimized = window.ext.hooks.useAppSelector(state => state.preferences.minimizedHomePageBoxes.includes('quickStart'));
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  const onHallOfFameClick = React.useCallback(() => {
    const playlist = playlists.find(p => p.title.toLowerCase().includes('hall of fame'));
    if (playlist) {
      // TODO: Reimplement
    }
  }, [playlists]);

  const onAllGamesClick = React.useCallback(() => {
    // TODO: Reimplement
  }, []);

  const onAllAnimationsClick = React.useCallback(() => {
    // TODO: Reimplement
  }, []);

  return (
    <HomePageBox
      minimized={minimized}
      cssKey={'quickStart'}
      title={strings.quickStartHeader}
      onToggleMinimize={() => toggleMinimizeBox('quickStart', minimized)}>
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
    </HomePageBox>
  );
}

export function HomePageComponentNotes(props: HomePageComponentProps) {
  const { toggleMinimizeBox } = props;
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;
  const minimized = window.ext.hooks.useAppSelector(state => state.preferences.minimizedHomePageBoxes.includes('notes'));

  const propsRef = useRef(props);
  const toggleMinimizeBoxRef = useRef(toggleMinimizeBox);
  const allStringsRef = useRef(allStrings);
  const stringsRef = useRef(strings);
  const minimizedRef = useRef(minimized);

  // Effect to compare and log changes
  useEffect(() => {
    const changes = [];

    if (propsRef.current !== props) {
      changes.push('props');
      propsRef.current = props;
    }

    if (toggleMinimizeBoxRef.current !== toggleMinimizeBox) {
      changes.push('toggleMinimizeBox function');
      toggleMinimizeBoxRef.current = toggleMinimizeBox;
    }

    if (allStringsRef.current !== allStrings) {
      changes.push('allStrings (LangContext)');
      allStringsRef.current = allStrings;
    }

    if (stringsRef.current !== strings) {
      changes.push('strings.home');
      stringsRef.current = strings;
    }

    if (minimizedRef.current !== minimized) {
      changes.push(`minimized (${minimizedRef.current} -> ${minimized})`);
      minimizedRef.current = minimized;
    }

    if (changes.length > 0) {
      console.log('HomePageComponentNotes re-render caused by:', changes.join(', '));
    }
  });

  return (
    <HomePageBox
      minimized={minimized}
      title={strings.notesHeader}
      cssKey='notes'
      onToggleMinimize={() => toggleMinimizeBox('notes', minimized)}>
      <QuickStartItem>
        {strings.notes}
      </QuickStartItem>
    </HomePageBox>
  );
}

export function HomePageComponentRandomGames(props: HomePageComponentProps) {
  const { onLaunchGame, toggleMinimizeBox, onGameContextMenu } = props;
  const minimized = window.ext.hooks.useAppSelector(state => state.preferences.minimizedHomePageBoxes.includes('random-games'));
  const logoVersion = window.ext.hooks.useAppSelector(state => state.main.logoVersion);
  const tagFilters = window.ext.hooks.useAppSelector(state => state.preferences.tagFilters);
  const screenshotPreviewMode = window.ext.hooks.useAppSelector(state => state.preferences.screenshotPreviewMode);
  const screenshotPreviewDelay = window.ext.hooks.useAppSelector(state => state.preferences.screenshotPreviewDelay);
  const hideExtremeScreenshots = window.ext.hooks.useAppSelector(state => state.preferences.hideExtremeScreenshots);
  const randomGames = window.ext.hooks.useAppSelector(state => state.main.randomGames);
  const requestingRandomGames = window.ext.hooks.useAppSelector(state => state.main.requestingRandomGames);
  const excludedRandomLibraries = window.ext.hooks.useAppSelector(state => state.preferences.excludedRandomLibraries);
  const view = useView();
  const dispatch = window.ext.hooks.useAppDispatch();

  const rollRandomGames = () => {
    // Request more games to the queue
    if (randomGames.length <= (RANDOM_GAME_ROW_COUNT * 5) && !requestingRandomGames) {
      dispatch(setMainState({
        requestingRandomGames: true
      }));

      window.Shared.back.request(BackIn.RANDOM_GAMES, {
        count: RANDOM_GAME_ROW_COUNT * 10,
        excludedLibraries: excludedRandomLibraries,
      })
      .then((data) => {
        dispatch(addRandomGames(data));
      });
    }
  };

  const onSelectGame = async (gameId?: string) => {
    if (!gameId) { return; }
    const game = await idToGame(gameId);
    if (game) {
      dispatch(selectGame({
        view: GENERAL_VIEW_ID,
        game,
      }));
    }
  };

  return (
    <SizeProvider width={width} height={height}>
      <RandomGames
        games={randomGames}
        rollRandomGames={rollRandomGames}
        onGameContextMenu={onGameContextMenu}
        onLaunchGame={onLaunchGame}
        onGameSelect={onSelectGame}
        extremeTags={tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), [])}
        logoVersion={logoVersion}
        selectedGameId={view.selectedGame?.id}
        screenshotPreviewMode={screenshotPreviewMode}
        screenshotPreviewDelay={screenshotPreviewDelay}
        hideExtremeScreenshots={hideExtremeScreenshots}
        minimized={minimized}
        onToggleMinimize={() => toggleMinimizeBox('random-games', minimized)} />
    </SizeProvider>
  );
}

export function HomePageComponentExtras(props: HomePageComponentProps) {
  const { toggleMinimizeBox } = props;
  const minimized = window.ext.hooks.useAppSelector(state => state.preferences.minimizedHomePageBoxes.includes('extras'));
  const logoVersion = window.ext.hooks.useAppSelector(state => state.main.logoVersion);
  const viewObj = window.ext.hooks.useAppSelector((state) => state.search.views);
  const platforms = window.ext.hooks.useAppSelector(state => state.main.suggestions.platforms);
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  const views = Object.keys(viewObj);
  let viewName = '';
  for (const view of views) {
    if (view !== GENERAL_VIEW_ID) {
      viewName = view;
      break;
    }
  }

  const onSearchPlatform = (platform: string) => {
    searchActions.setSearchText({
      view: viewName,
      text: `platform:"${platform}"`
    });
  };

  const sortedPlatforms = [...platforms].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return (
    <HomePageBox
      minimized={minimized}
      cssKey={'extras'}
      title={strings.extrasHeader}
      onToggleMinimize={() => toggleMinimizeBox('extras', minimized)}>
      <QuickStartItem icon='puzzle-piece'>
        {strings.filterByPlatform}:
      </QuickStartItem>
      <QuickStartItem className='home-page__box-item--platforms'>
        <div className='home-page__platform-box'>
          {sortedPlatforms.map((platform, idx) => (
            <Link
              key={idx}
              className='home-page__platform-entry'
              to={joinLibraryRoute(viewName)}
              onClick={() => onSearchPlatform(platform)}>
              <div
                className='home-page__platform-entry__logo'
                style={{ backgroundImage: `url("${getPlatformIconURL(platform, logoVersion)}")` }}/>
              <div className='home-page__platform-entry__text'>{platform}</div>
            </Link>
          )
          )}
        </div>
      </QuickStartItem><br />
    </HomePageBox>
  );
}

function QuickStartItem(props: { icon?: OpenIconType, className?: string, children?: React.ReactNode }): React.JSX.Element {
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

