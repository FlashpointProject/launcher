import { Playlist } from '@database/entity/Playlist';
import * as remote from '@electron/remote';
import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { BackIn, GameOfTheDay, ViewGame } from '@shared/back/types';
import { ARCADE, LOGOS, THEATRE } from '@shared/constants';
import { wrapSearchTerm } from '@shared/game/GameFilter';
import { LangContainer } from '@shared/lang';
import { updatePreferencesData } from '@shared/preferences/util';
import { getUpgradeString } from '@shared/upgrade/util';
import { formatString } from '@shared/utils/StringFormatter';
import { AppUpdater, UpdateInfo } from 'electron-updater';
import { Game } from 'flashpoint-launcher';
import * as React from 'react';
import ReactDatePicker from 'react-datepicker';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { ProgressContext } from '../../context/ProgressContext';
import { Paths } from '../../Paths';
import { UpgradeStage } from '../../upgrade/types';
import { getExtremeIconURL, getGameImageURL, getPlatformIconURL, joinLibraryRoute } from '../../Util';
import { LangContext } from '../../util/lang';
import { GameGridItem } from '../GameGridItem';
import { GameItemContainer } from '../GameItemContainer';
import { HomePageBox } from '../HomePageBox';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { AutoProgressComponent } from '../ProgressComponents';
import { RandomGames } from '../RandomGames';
import { SimpleButton } from '../SimpleButton';
import { SizeProvider } from '../SizeProvider';

type OwnProps = {
  gotdList: GameOfTheDay[];
  platforms: Record<string, string[]>;
  playlists: Playlist[];
  /** Data and state used for the upgrade system (optional install-able downloads from the HomePage). */
  upgrades: UpgradeStage[];
  /** Generator for game context menu */
  onGameContextMenu: (gameId: string) => void;
  onSelectPlaylist: (library: string, playlistId: string | undefined) => void;
  onLaunchGame: (gameId: string) => void;
  onGameSelect: (gameId: string | undefined) => void;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** Called when the "download tech" button is clicked. */
  onDownloadUpgradeClick: (stage: UpgradeStage, strings: LangContainer) => void;
  /** Whether an update is available to the Launcher */
  updateInfo: UpdateInfo | undefined;
  /** Callback to initiate the update */
  autoUpdater: AppUpdater;
  /** Pass to Random Picks */
  randomGames: ViewGame[];
  /** Re-rolls the Random Games */
  rollRandomGames: () => void;
  /** Update to clear platform icon cache */
  logoVersion: number;
  /** Raw HTML of the Update page grabbed */
  updateFeedMarkdown: string;
  selectedGameId?: string;
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithSearchProps;

const updateProgressKey = 'home-page__update-progress';

export function HomePage(props: HomePageProps) {
  const { onDownloadUpgradeClick } = props;

  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  const logoDelay = React.useMemo(() => (Date.now() * -0.001) + 's', []);

  const parsedGotdList = React.useMemo(() => {
    return props.gotdList.map(g => {
      const parts = g.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const newDate = new Date(year, month - 1, day);
      return {
        ...g,
        date: newDate
      };
    }).sort((a, b) => { return a.date.getTime() - b.date.getTime(); });
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

  const upgradeStages = props.upgrades;

  /** Whether the Update Available button has been pressed */
  const [updateStarted, setUpdateStarted] = React.useState(false);
  const [progressState] = React.useContext(ProgressContext.context);

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

  const onGameSelect = React.useCallback((gameId: string | undefined) => {
    props.onGameSelect(gameId);
  }, [props.onGameSelect]);

  const onLaunchGame = React.useCallback((gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const onHallOfFameClick = React.useCallback(() => {
    const playlist = props.playlists.find(p => p.title.toLowerCase().includes('hall of fame'));
    if (playlist) {
      props.onSelectPlaylist(ARCADE, playlist.id);
      props.clearSearch();
    }
  }, [props.playlists, props.onSelectPlaylist, props.clearSearch]);

  const onFavoriteClick = React.useCallback(() => {
    const playlist = props.playlists.find(p => p.title === '*Favorites*');
    if (playlist) {
      props.onSelectPlaylist(ARCADE, playlist.id);
      props.clearSearch();
    }
  }, [props.playlists, props.onSelectPlaylist, props.clearSearch]);

  const onAllGamesClick = React.useCallback(() => {
    props.onSelectPlaylist(ARCADE, undefined);
    props.clearSearch();
  }, [props.onSelectPlaylist, props.clearSearch]);

  const onAllAnimationsClick = React.useCallback(() => {
    props.onSelectPlaylist(THEATRE, undefined);
    props.clearSearch();
  }, [props.onSelectPlaylist, props.clearSearch]);

  const platformList = React.useMemo(() => {
    const libraries = Object.keys(props.platforms);
    const elements: JSX.Element[] = [];
    let key = 0;
    for (let i = 0; i < libraries.length; i++) {
      const library = libraries[i];
      const platforms = props.platforms[library];
      if (platforms.length > 0) {
        // Add a space between library platforms
        if (i !== 0) {
          elements.push(<br key={key++} />);
          elements.push(<br key={key++} />);
        }
        // Add library name above links
        elements.push(<p key={key++}>{allStrings.libraries[library] || library}</p>);
        // Add all libraries from the platform
        elements.push(
          <div
            className='home-page__platform-box'
            key={key++} >
            {platforms.map((platform, j) => (
              <Link
                key={j}
                className='home-page__platform-entry'
                to={joinLibraryRoute(library)}
                onClick={() => {
                  props.onSearch('!' + wrapSearchTerm(platform));
                  props.onSelectPlaylist(library, undefined);
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
      }
    }
    return elements;
  }, [props.platforms]);

  // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
  const height = 140;
  const width: number = (height * 0.666) | 0;

  // Render all owned ProgressData as components
  const updateProgressComponent = React.useMemo(() => {
    const progressArray = progressState[updateProgressKey];
    if (progressArray) {
      return progressArray.map((data, index) => (
        <AutoProgressComponent
          key={index}
          progressData={data}
          wrapperClass={'home-page__progress-wrapper'} />
      ));
    }
  }, [progressState[updateProgressKey]]);

  // -- Render the boxes --

  const renderedUpdates = React.useMemo(() => {
    /** TODO: Retire or rework this feature later */
    // eslint-disable-next-line no-constant-condition
    if (false) {
      // return (
      //   <div className='home-page__box'>
      //     <div className='home-page__box-head'>{strings.updateHeader}</div>
      //     <ul className='home-page__box-body home-page__update-box'>
      //       {strings.currentVersion} - {remote.app.getVersion()}
      //       <br/>
      //       { props.updateInfo !== undefined ? (
      //         <>
      //           <p>{strings.nextVersion} - {props.updateInfo.version}</p>
      //           { updateStarted ? undefined : (
      //             <SimpleButton
      //               value={strings.updateAvailable}
      //               onClick={() => {
      //                 if (props.updateInfo) {
      //                   const updateNow = onUpdateDownload(props.updateInfo, props.autoUpdater.downloadUpdate);
      //                   if (updateNow) {
      //                     const updateProgressState = newProgress(updateProgressKey, progressDispatch);
      //                     ProgressDispatch.setText(updateProgressState, strings.downloadingUpdate);
      //                     props.autoUpdater.on('download-progress', (progress) => {
      //                       ProgressDispatch.setPercentDone(updateProgressState, Math.floor(progress.percent));
      //                     });
      //                     props.autoUpdater.once('update-downloaded', (info) => {
      //                       ProgressDispatch.finished(updateProgressState);
      //                     });
      //                     props.autoUpdater.downloadUpdate();
      //                     setUpdateStarted(true);
      //                   }
      //                 }
      //               }}>
      //             </SimpleButton>
      //           ) }
      //           { updateProgressComponent }
      //         </>
      //       ) : strings.upToDate }
      //     </ul>
      //   </div>
      // );
    } else {
      return (
        <></>
      );
    }
  }, [strings, props.autoUpdater, props.updateInfo, updateStarted, setUpdateStarted, updateProgressComponent]);

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
        <QuickStartItem icon='heart'>
          <Link
            to={joinLibraryRoute(ARCADE)}
            onClick={onFavoriteClick}>
            {strings.favoritesPlaylist}
          </Link>
        </QuickStartItem><QuickStartItem icon='list'>
          <div
            onClick={() => remote.shell.openExternal('http://bluemaxima.org/flashpoint/datahub/Tags')}
            className='clickable-url' >
            {strings.tagList}
          </div>
        </QuickStartItem><br /><QuickStartItem icon='puzzle-piece'>
          {strings.filterByPlatform}:
        </QuickStartItem><QuickStartItem className='home-page__box-item--platforms'>
          {platformList}
        </QuickStartItem><br />
        <QuickStartItem icon='code'>
          <div
            onClick={() => remote.shell.openExternal('https://trello.com/b/Tu9E5GLk/launcher')}
            className='clickable-url' >
            {strings.plannedFeatures}
          </div>
        </QuickStartItem>
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

  const renderedUpgrades = React.useMemo(() => {
    if (upgradeStages.length > 0) {
      const renderedStages: JSX.Element[] = [];
      for (let i = 0; i < upgradeStages.length; i++) {
        renderedStages.push(
          <div key={i * 2}>
            {renderStageSection(allStrings, upgradeStages[i], (stage) => onDownloadUpgradeClick(stage, allStrings))}
          </div>
        );
        renderedStages.push(
          <br key={(i * 2) + 1}/>
        );
      }
      // Remove trailing <br/>
      if (renderedStages.length > 0) { renderedStages.pop(); }
      return (
        <HomePageBox
          minimized={props.preferencesData.minimizedHomePageBoxes.includes('upgrades')}
          cssKey='upgrades'
          title={strings.upgradesHeader}
          onToggleMinimize={() => toggleMinimizeBox('upgrades')}>
          {renderedStages}
        </HomePageBox>
      );
    }
  }, [allStrings, upgradeStages, onDownloadUpgradeClick]);

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

  const renderedRandomGames = React.useMemo(() => (
    <SizeProvider width={width} height={height}>
      <RandomGames
        games={props.randomGames}
        rollRandomGames={props.rollRandomGames}
        onGameContextMenu={props.onGameContextMenu}
        onLaunchGame={onLaunchGame}
        onGameSelect={onGameSelect}
        extremeTags={props.preferencesData.tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), [])}
        logoVersion={props.logoVersion}
        selectedGameId={props.selectedGameId}
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('random-games')}
        onToggleMinimize={() => toggleMinimizeBox('random-games')} />
    </SizeProvider>
  ), [strings, props.onGameContextMenu, props.selectedGameId, props.logoVersion, props.preferencesData.tagFilters, props.randomGames, onLaunchGame, props.rollRandomGames, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const [loadedGotd, setLoadedGotd] = React.useState<Game | null>(null);
  React.useEffect(() => {
    if (selectedGotd) {
      window.Shared.back.request(BackIn.GET_GAME, selectedGotd.id)
      .then((game) => {
        setLoadedGotd(game);
      });
    }
  }, [selectedGotd]);

  const extremeIconPath = React.useMemo(() => getExtremeIconURL(props.logoVersion), [props.logoVersion]);

  const renderedGotd = React.useMemo(() => {
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
                  onGameSelect={(event, gameId) => props.onGameSelect(gameId)}
                  onGameLaunch={(event, gameId) => props.onLaunchGame(gameId)}
                  findGameId={() => loadedGotd.id}>
                  <GameGridItem
                    key={loadedGotd.id}
                    id={loadedGotd.id}
                    title={loadedGotd.title}
                    platform={loadedGotd.platform}
                    extreme={loadedGotd.tagsStr.split(';').findIndex(t => extremeTags.includes(t.trim())) !== -1}
                    extremeIconPath={extremeIconPath}
                    thumbnail={getGameImageURL(LOGOS, loadedGotd.id)}
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

  const renderedUpdateFeed = React.useMemo(() => {
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

  // Render
  return React.useMemo(() => (
    <div className='home-page simple-scroll'>
      <div className='home-page__inner'>
        {/* Logo */}
        <div className='home-page__logo fp-logo-box'>
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
        {/* Update Feed */}
        { renderedUpdateFeed }
        {/* Game of the Day */}
        { renderedGotd }
        {/* Updates */}
        { renderedUpdates }
        {/* Quick Start */}
        { renderedQuickStart }
        {/* Notes */}
        { renderedNotes }
        {/* Upgrades */}
        { renderedUpgrades }
        {/* Random Games */}
        { renderedRandomGames }
        {/* Extras */}
        { renderedExtras }
      </div>
    </div>
  ), [renderedUpdates, renderedQuickStart, renderedUpgrades, renderedExtras, renderedNotes, renderedRandomGames, renderedUpdateFeed, renderedGotd]);
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

function renderStageSection(strings: LangContainer, stage: UpgradeStage, onDownload: (stage: UpgradeStage) => void) {
  return (
    <>
      <QuickStartItem><b>{getUpgradeString(stage.title, strings.upgrades)}</b></QuickStartItem>
      <QuickStartItem><i>{getUpgradeString(stage.description, strings.upgrades)}</i></QuickStartItem>
      <QuickStartItem>{ renderStageButton(strings.home, stage, onDownload) }</QuickStartItem>
    </>
  );
}

function renderStageButton(strings: LangContainer['home'], stage: UpgradeStage, onDownload: (stage: UpgradeStage) => void) {
  const stageState = stage.state;
  return (
    stageState.checksDone ? (
      stageState.alreadyInstalled && stageState.upToDate ? (
        <p className='home-page__grayed-out'>{strings.alreadyInstalled}</p>
      ) : (
        stageState.isInstallationComplete ? (
          strings.installComplete
        ) : (
          stageState.isInstalling ? (
            <p>{stageState.installProgressNote}</p>
          ) : (
            <a
              className='simple-button'
              onClick={() => { onDownload(stage); }}>
              {stageState.alreadyInstalled ? strings.update : strings.download}
            </a>
          )
        )
      )
    ) : strings.checkingUpgradeState
  );
}

// function onUpdateDownload(updateInfo: UpdateInfo, downloadFunc: () => void): boolean {
//   const message = (updateInfo.releaseName ? `${updateInfo.releaseName}\n\n` : '')
//               + (updateInfo.releaseNotes ? `Release Notes:\n${updateInfo.releaseNotes}\n\n` : 'No Release Notes Available.\n\n')
//               + 'Download and Install now?';
//   const res = remote.dialog.showMessageBoxSync({
//     title: 'Update Available',
//     message: message,
//     buttons: ['Yes', 'No']
//   });
//   if (res === 0) {
//     return true;
//   }
//   return false;
// }
