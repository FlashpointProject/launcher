import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { WithMainStateProps } from '@renderer/containers/withMainState';
import { BackIn, GameOfTheDay } from '@shared/back/types';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { DialogState, GameLaunchOverride, Playlist, ViewGame } from 'flashpoint-launcher';
import { HomePageComponentProps } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { LangContext } from '../../util/lang';
import { DynamicComponent } from '../DynamicComponent';
import { SimpleButton } from '../SimpleButton';

type OwnProps = {
  gotdList: GameOfTheDay[] | undefined;
  platforms: string[];
  playlists: Playlist[];
  /** Generator for game context menu */
  onGameContextMenu: (gameId: string, logoPath: string, screenshotPath: string) => void;
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
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithSearchProps & WithMainStateProps;

export function HomePage(props: HomePageProps) {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  const logoDelay = (Date.now() * -0.001) + 's';
  const [updating, setUpdating] = React.useState(false);
  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  const toggleMinimizeBox = (cssKey: string) => {
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
  };

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
  const updateText = props.main.metadataUpdate.ready ? (
    props.main.metadataUpdate.total > 0 ? strings.update :
      props.main.metadataUpdate.total === -1 ? strings.error : strings.checkForUpdates
  ) : strings.checkingUpdate;

  const homePageComponentProps: HomePageComponentProps = {
    playlists: props.playlists,
    randomGames: props.randomGames,
    rollRandomGames: props.rollRandomGames,
    onGameContextMenu: props.onGameContextMenu,
    onLaunchGame: (gameId) => props.onLaunchGame(gameId, null),
    selectedGameId: props.selectedGameId,
    platforms: props.platforms,
    logoVersion: props.logoVersion,
    preferencesData: props.preferencesData,
    gotdList: props.gotdList,
    updateFeedMarkdown: props.updateFeedMarkdown,
    toggleMinimizeBox,
  };

  // Render
  return (
    <div className='home-page simple-scroll'>
      <div className='home-page__inner'>
        {/* Logo */}
        <div className='home-page__logo fp-logo-box'>
          {/* Metadata Update */}
          { props.preferencesData.gameMetadataSources.length > 0 && (
            <div className='update-metadata-box'>
              <div className='update-metadata-button'>
                <SimpleButton
                  className='update-metadata-button-inner'
                  value={updateText}
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
          ) }
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
        {props.main.displaySettings.homePage.map(key =>
          <DynamicComponent
            name={key}
            props={homePageComponentProps} />
        )}
      </div>
    </div>
  );
}
