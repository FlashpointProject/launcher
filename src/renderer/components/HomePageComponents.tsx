import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { GENERAL_VIEW_ID, searchActions, selectGame } from '@renderer/store/search/slice';
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
import React, { useMemo } from 'react';
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

export function HomePageComponentUpdateFeed(props: HomePageComponentProps) {
  const { toggleMinimizeBox, updateFeedMarkdown } = props;
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  if (updateFeedMarkdown) {
    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('updateFeed')}
        title={strings.updateFeedHeader}
        cssKey='updateFeed'
        onToggleMinimize={() => toggleMinimizeBox('updateFeed')}>
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
  const { preferencesData, logoVersion, gotdList, toggleMinimizeBox } = props;
  const dispatch = useAppDispatch();
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;
  const extremeTags = preferencesData.tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

  const getContentIcons = (game: Content | Game) => {
    return isGame(game) ? game.platforms.slice(0, 5).map(p => getPlatformIconURL(p, props.logoVersion)) : [];
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
  const { toggleMinimizeBox, playlists } = props;
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
      minimized={props.preferencesData.minimizedHomePageBoxes.includes('quickStart')}
      cssKey={'quickStart'}
      title={strings.quickStartHeader}
      onToggleMinimize={() => toggleMinimizeBox('quickStart')}>
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

  return (
    <HomePageBox
      minimized={props.preferencesData.minimizedHomePageBoxes.includes('notes')}
      title={strings.notesHeader}
      cssKey='notes'
      onToggleMinimize={() => toggleMinimizeBox('notes')}>
      <QuickStartItem>
        {strings.notes}
      </QuickStartItem>
    </HomePageBox>
  );
}

export function HomePageComponentRandomGames(props: HomePageComponentProps) {
  const { onLaunchGame, toggleMinimizeBox, onGameContextMenu, randomGames, rollRandomGames } = props;
  const dispatch = useAppDispatch();

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
        extremeTags={props.preferencesData.tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), [])}
        logoVersion={props.logoVersion}
        selectedGameId={props.selectedGameId}
        screenshotPreviewMode={props.preferencesData.screenshotPreviewMode}
        screenshotPreviewDelay={props.preferencesData.screenshotPreviewDelay}
        hideExtremeScreenshots={props.preferencesData.hideExtremeScreenshots}
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('random-games')}
        onToggleMinimize={() => toggleMinimizeBox('random-games')} />
    </SizeProvider>
  );
}

export function HomePageComponentExtras(props: HomePageComponentProps) {
  const { platforms, logoVersion, toggleMinimizeBox } = props;
  const viewObj = useAppSelector((state) => state.search.views);
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  const platformList: React.JSX.Element[] = [];
  const views = Object.keys(viewObj);
  let viewName = '';
  for (const view of views) {
    if (view !== GENERAL_VIEW_ID) {
      viewName = view;
      break;
    }
  }

  const sortedPlatforms = [...platforms].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  platformList.push(
    <div className='home-page__platform-box'>
      {sortedPlatforms.map((platform, idx) => (
        <Link
          key={idx}
          className='home-page__platform-entry'
          to={joinLibraryRoute(viewName)}
          onClick={() => {
            searchActions.setSearchText({
              view: viewName,
              text: `platform:"${platform}"`
            });
          }}>
          <div
            className='home-page__platform-entry__logo'
            style={{ backgroundImage: `url("${getPlatformIconURL(platform, logoVersion)}")` }}/>
          <div className='home-page__platform-entry__text'>{platform}</div>
        </Link>
      )
      )}
    </div>
  );

  return (
    <HomePageBox
      minimized={props.preferencesData.minimizedHomePageBoxes.includes('extras')}
      cssKey={'extras'}
      title={strings.extrasHeader}
      onToggleMinimize={() => toggleMinimizeBox('extras')}>
      <QuickStartItem icon='puzzle-piece'>
        {strings.filterByPlatform}:
      </QuickStartItem>
      <QuickStartItem className='home-page__box-item--platforms'>
        {platformList}
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

