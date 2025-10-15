import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { createDialog, setUpdateInfo } from '@renderer/store/main/slice';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { BackIn, GameOfTheDay } from '@shared/back/types';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { DialogState, GameLaunchOverride, GameMetadataSource, Playlist, ViewGame } from 'flashpoint-launcher';
import { HomePageComponentProps } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { LangContext } from '../../util/lang';
import { DynamicComponent } from '../DynamicComponent';
import { SimpleButton } from '../SimpleButton';

export type HomePageProps = {
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

export function HomePage(props: HomePageProps) {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  // eslint-disable-next-line react-hooks/purity
  const logoDelay = React.useRef((Date.now() * -0.001) + 's').current;
  const [updating, setUpdating] = React.useState(false);
  const allStrings = React.useContext(LangContext);
  const dispatch = useAppDispatch();
  const metadataUpdate = useAppSelector(state => state.main.metadataUpdate);
  const displaySettings = useAppSelector(state => state.main.displaySettings);
  const preferences = useAppSelector(state => state.preferences);
  const strings = allStrings.home;

  const toggleMinimizeBox = (cssKey: string) => {
    const newBoxes = [...preferences.minimizedHomePageBoxes];
    const idx = newBoxes.findIndex(s => s === cssKey);
    if (idx === -1) {
      newBoxes.push(cssKey);
    } else {
      newBoxes.splice(idx, 1);
    }
    dispatch(updatePreferences({
      minimizedHomePageBoxes: newBoxes
    }));
  };

  const onPressUpdate = (source: GameMetadataSource) => {
    if (updating) {
      return;
    }
    setUpdating(true);

    const preUpdateInfo = metadataUpdate[source.id];

    if (preUpdateInfo.total <= 0) {
      // Fetch update info
      window.Shared.back.request(BackIn.PRE_UPDATE_INFO, source)
      .then((total) => {
        dispatch(setUpdateInfo({
          id: source.id,
          total
        }));
      })
      .finally(() => {
        setUpdating(false);
      });
    } else {
      // Do update
      return window.Shared.back.request(BackIn.SYNC_ALL, source)
      .then((success) => {
        if (success) {
          const dialog: DialogState = {
            largeMessage: true,
            message: strings.updateComplete,
            buttons: [allStrings.misc.ok],
            id: uuid()
          };
          dispatch(createDialog(dialog));
          dispatch(setUpdateInfo({
            id: source.id,
            total: 0
          }));
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
        dispatch(createDialog(dialog));
      })
      .finally(() => {
        setUpdating(false);
      });
    }
  };

  const homePageComponentProps: HomePageComponentProps = {
    playlists: props.playlists,
    randomGames: props.randomGames,
    rollRandomGames: props.rollRandomGames,
    onGameContextMenu: props.onGameContextMenu,
    onLaunchGame: (gameId) => props.onLaunchGame(gameId, null),
    selectedGameId: props.selectedGameId,
    platforms: props.platforms,
    logoVersion: props.logoVersion,
    preferencesData: preferences,
    gotdList: props.gotdList,
    updateFeedMarkdown: props.updateFeedMarkdown,
    toggleMinimizeBox,
  };

  const UpdateComponent = () => {
    if (preferences.gameMetadataSources.length === 0) {
      return <></>;
    }

    let updateReady = false;
    for (const info of Object.values(metadataUpdate)) {
      if (info.ready) {
        updateReady = true;
        break;
      }
    }

    // Collect individual blocks
    const updateBlocks: React.JSX.Element[] = preferences.gameMetadataSources.map(source => {
      let preUpdateInfo = metadataUpdate[source.id];
      if (preUpdateInfo === undefined) {
        preUpdateInfo = {
          ready: false,
          total: 0
        };
      }
      let button = <></>;
      const updateText = preUpdateInfo.ready ? (
        preUpdateInfo.total > 0 ? strings.update :
          preUpdateInfo.total === -1 ? strings.error : strings.checkForUpdates
      ) : strings.checkingUpdate;

      if (preUpdateInfo === undefined) {
        button = <SimpleButton disabled={true} value={updateText}/>;
      } else if (preUpdateInfo.ready && preUpdateInfo.total > 0) {
        button = <SimpleButton value={updateText} onClick={() => onPressUpdate(source)}/>;
      }

      return (
        <div>
          <div className='update-metadata-name'>
            {source.name}
          </div>
          { preUpdateInfo.ready && preUpdateInfo.total > 0 && (
            <div className='update-metadata-last'>
              {formatString(strings.updatedGamesReady, (preUpdateInfo.total + 1).toString())}
            </div>
          )}
          <div className='update-metadata-last'>
            {`${strings.lastUpdated}: ${(new Date(source.games.actualUpdateTime)).toLocaleString()}`}
          </div>
          {button}
        </div>
      );
    });

    if (updateReady) {
      updateBlocks.unshift(
        <div className='update-metadata-button'>
          <SimpleButton
            className='update-metadata-button-inner'
            value={strings.update}
            disabled={updating}
            onClick={async () => {
              for (const info of Object.entries(metadataUpdate)) {
                if (info[1].ready && info[1].total > 0) {
                  const source = preferences.gameMetadataSources.find(s => s.id === info[0]);
                  if (source) {
                    await onPressUpdate(source);
                  }
                }
              }
            }} />
        </div>
      );
    }

    return <div className='update-metadata-box'>
      {updateBlocks}
    </div>;
  };

  // Render
  return (
    <div className='home-page simple-scroll'>
      <div className='home-page__inner'>
        {/* Logo */}
        <div className='home-page__logo fp-logo-box'>
          <UpdateComponent/>
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
        {displaySettings.homePage.map(key =>
          <DynamicComponent
            name={key}
            props={homePageComponentProps} />
        )}
      </div>
    </div>
  );
}
