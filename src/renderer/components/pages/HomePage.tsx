import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { setUpdateInfo } from '@renderer/store/main/slice';
import { setHomePageBoxOpen } from '@renderer/store/preferences/slice';
import { launchGame } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { formatString } from '@shared/utils/StringFormatter';
import { GameLaunchOverride, GameMetadataSource } from 'flashpoint-launcher';
import { HomePageComponentProps } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { useState } from 'react';
import { DynamicComponent } from '../DynamicComponent';
import { SimpleButton } from '../SimpleButton';

export function HomePage() {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  // eslint-disable-next-line react-hooks/purity
  const logoDelay = React.useRef((Date.now() * -0.001) + 's').current;
  const dispatch = useAppDispatch();
  const displaySettings = useAppSelector(state => state.main.displaySettings);

  const onLaunchGame = async (gameId: string, override: GameLaunchOverride) => {
    launchGame(dispatch, gameId, override);
  };

  const toggleMinimizeBox = (box: string, open: boolean) => {
    dispatch(setHomePageBoxOpen({
      box,
      open
    }));
  };

  const homePageComponentProps: HomePageComponentProps = {
    onLaunchGame: (gameId) => onLaunchGame(gameId, null),
    toggleMinimizeBox,
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
            key={key}
            name={key}
            props={homePageComponentProps} />
        )}
      </div>
    </div>
  );
}

function UpdateComponent() {
  const gameMetadataSources = useAppSelector(state => state.preferences.gameMetadataSources);
  const metadataUpdate = useAppSelector(state => state.main.metadataUpdate);
  const allStrings = useLocalization();
  const dispatch = useAppDispatch();
  const [updating, setUpdating] = useState(false);
  const strings = allStrings.home;

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
      .catch((err) => {
        log.error('Launcher', `Error updating metadata: ${err}`);
      })
      .finally(() => {
        setUpdating(false);
      });
    }
  };

  if (gameMetadataSources.length === 0) {
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
  const updateBlocks: React.JSX.Element[] = gameMetadataSources.map(source => {
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
      <div key={source.id}>
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
      <div key={'meta-block'} className='update-metadata-button'>
        <SimpleButton
          className='update-metadata-button-inner'
          value={strings.update}
          disabled={updating}
          onClick={async () => {
            for (const info of Object.entries(metadataUpdate)) {
              if (info[1].ready && info[1].total > 0) {
                const source = gameMetadataSources.find(s => s.id === info[0]);
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
}
