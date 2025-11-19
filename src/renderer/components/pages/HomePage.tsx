import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { createErrorDialogWithPrefix } from '@renderer/dialog';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { setUpdateInfo } from '@renderer/store/main/slice';
import { setHomePageBoxOpen } from '@renderer/store/preferences/slice';
import { launchGame } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { formatString } from '@shared/utils/StringFormatter';
import { GameLaunchOverride, GameMetadataSource, LangContainer, MetaUpdateInfo } from 'flashpoint-launcher';
import { HomePageComponentProps } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { DynamicComponent } from '../DynamicComponent';
import { SimpleButton } from '../SimpleButton';

export function HomePage() {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  // eslint-disable-next-line react-hooks/purity
  const logoDelay = React.useRef((Date.now() * -0.001) + 's').current;
  const dispatch = useAppDispatch();
  const displaySettings = useAppSelector(state => state.main.displaySettings);

  const onLaunchGame = async (gameId: string, override: GameLaunchOverride) => {
    launchGame(dispatch, gameId, 'flashpoint-archive');
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

  const onApplyUpdate = async (source: GameMetadataSource) => {
    return window.Shared.back.request(BackIn.SYNC_ALL, source)
    .catch(createErrorDialogWithPrefix('Error updating metadata'));
  };

  const onCheckForUpdate = async (source: GameMetadataSource) => {
    return window.Shared.back.request(BackIn.PRE_UPDATE_INFO, source)
    .then((total) => {
      dispatch(setUpdateInfo({
        id: source.id,
        total
      }));
      return total;
    })
    .finally(() => {
      setUpdating(false);
    });
  };

  const onApplyUpdateRow = withUpdating(onApplyUpdate);
  const onCheckUpdateRow = withUpdating(onCheckForUpdate);

  if (gameMetadataSources.length === 0) {
    return <></>;
  }

  let updateAvailable = false;
  for (const info of Object.values(metadataUpdate)) {
    if (info.total > 0) {
      updateAvailable = true;
      break;
    }
  }

  // Collect individual blocks
  const updateBlocks: React.JSX.Element[] = gameMetadataSources.map(source => {
    const preUpdateInfo = metadataUpdate[source.id] as MetaUpdateInfo | undefined;

    console.log(JSON.stringify(preUpdateInfo));

    return (
      <UpdateRow
        source={source}
        preUpdateInfo={preUpdateInfo}
        strings={allStrings}
        busy={updating}
        onApplyUpdate={() => onApplyUpdateRow(setUpdating, updating, source)}
        onCheckForUpdate={() => onCheckUpdateRow(setUpdating, updating, source)}/>
    );
  });

  updateBlocks.unshift(
    <div key={'meta-block'} className='update-metadata-button'>
      <SimpleButton
        className='update-metadata-button-inner'
        value={updateAvailable ? strings.update : strings.checkForUpdates}
        disabled={updating}
        onClick={async () => {
          if (!updating) {
            setUpdating(true);
            let updated = false;
            let total = -1;
            for (const source of gameMetadataSources) {
              const preUpdateInfo = metadataUpdate[source.id] as MetaUpdateInfo | undefined;
              if (preUpdateInfo && preUpdateInfo.total > 0) {
                updated = true;
                await onApplyUpdate(source);
              } else {
                console.log('checking update');
                const sourceTotal = await onCheckForUpdate(source);
                if (total === -1) {
                  total = sourceTotal;
                } else {
                  total += sourceTotal;
                }
              }
            }
            console.log(updated);
            console.log(total);
            if (!updated && total === 0) {
              toast(strings.upToDate);
            }
            setUpdating(false);
          }
        }} />
    </div>
  );

  return <div className='update-metadata-box'>
    {updateBlocks}
  </div>;
}

type UpdateRowProps = {
  strings: LangContainer,
  source: GameMetadataSource;
  preUpdateInfo?: MetaUpdateInfo;
  busy: boolean;
  onApplyUpdate: () => void;
  onCheckForUpdate: () => Promise<number>;
}

function UpdateRow({ preUpdateInfo, strings, source, busy, onApplyUpdate, onCheckForUpdate }: UpdateRowProps) {
  return (
    <div key={source.id}>
      <div className='update-metadata-name'>
        {source.name}
      </div>
      { preUpdateInfo !== undefined && preUpdateInfo.total > 0 && (
        <div className='update-metadata-last'>
          {formatString(strings.home.updatedGamesReady, (preUpdateInfo.total + 1).toString())}
        </div>
      )}
      <div className='update-metadata-last'>
        {`${strings.home.lastUpdated}: ${(new Date(source.games.actualUpdateTime)).toLocaleString()}`}
      </div>
      <SimpleButton
        disabled={busy || (preUpdateInfo === undefined)}
        onClick={() => {
          if (preUpdateInfo !== undefined) {
            if (preUpdateInfo.total === 0) {
              onCheckForUpdate()
              .then((total) => {
                if (total === 0) {
                  toast(strings.home.upToDate);
                }
              });
            } else {
              onApplyUpdate();
            }
          }
        }}
        value={preUpdateInfo === undefined ? strings.home.checkingUpdate :
          preUpdateInfo.total > 0 ? strings.home.update : strings.home.checkForUpdates
        }/>
    </div>
  );
}

function withUpdating<T extends any[], R>(cb: (...args: T) => Promise<R>): (setUpdating: (val: boolean) => void, updating: boolean, ...args:T) => Promise<R> {
  return async (setUpdating: (val: boolean) => void, updating: boolean, ...args: T): Promise<R> => {
    if (!updating) {
      setUpdating(true);
      try {
        return await cb(...args);
      } finally {
        setUpdating(false);
      }
    } else {
      return Promise.reject(new Error('Operation already in progress'));
    }
  };
}
