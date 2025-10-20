import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { applyGameDelta, setGame } from '@renderer/store/fpfss/slice';
import { axios } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { mapFpfssGameToLocal, mapLocalToFpfssGame } from '@shared/Util';
import { Game } from 'flashpoint-launcher';
import { toast } from 'react-toastify';
import { RightBrowseSidebar } from './RightBrowseSidebar';

export function FpfssEditGame() {
  const fpfssBaseUrl = useAppSelector(state => state.preferences.fpfssBaseUrl);
  const localGame = useAppSelector(state => state.fpfss.editingGame);
  const gameMetadataSources = useAppSelector(state => state.preferences.gameMetadataSources);
  const user = useAppSelector(state => state.fpfss.user);
  const dispatch = useAppDispatch();

  const fetchFpfssGame = async (url: string) => {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${user?.accessToken}`
      }
    });
    const game = mapFpfssGameToLocal(res.data);
    dispatch(setGame(game));
  };

  const openFpfssEditGame = (url: string) => {
    // Force a tags update
    if (gameMetadataSources.length === 0) {
      alert('No metadata sources in preferences.json, aborting remote edit');
      return;
    }
    const source = gameMetadataSources[0];
    window.Shared.back.request(BackIn.SYNC_TAGGED, source)
    .then(() => {
      // Edit game in-launcher then send it back to server
      performFpfssAction(async (user) => {
        if (localGame) {
          alert('Game edit already open');
        } else {
          // Download Game metadata and add to state
          return fetchFpfssGame(url);
        }
      });
    })
    .catch((err) => {
      alert(`Failed to update tags: ${err}`);
    });
  };

  const onDiscardGame = () => {
    dispatch(setGame(null));
  };

  const onSaveGame = async () => {
    if (localGame && user) {
      const game = mapLocalToFpfssGame(localGame);
      dispatch(setGame(null));
      const url = `${fpfssBaseUrl}/api/game/${game.id}`;

      console.log(JSON.stringify(game));
      // Post changes
      await axios.post(url, game, {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`
        }
      })
      .then(() => {
        toast.success('Game Edit Submitted');
      }).catch((err) => {
        alert('Error submitting game changes: ' + err);
      });
    }
  };

  const onFpfssEditGame = (gameId: string) => {
    if (gameMetadataSources.length > 0) {
      const url = `${gameMetadataSources[0].baseUrl}/api/game/${gameId}`;
      openFpfssEditGame(url);
    }
  };

  const onEditGame = (game: Partial<Game>) => {
    dispatch(applyGameDelta(game));
  };

  const onUpdateActiveGameData = (dataOnDisk: boolean, id?: number) => {
    if (id) {
      dispatch(applyGameDelta({
        activeDataId: id
      }));
    }
  };

  if (!localGame) {
    return (<div>No game selected :(</div>);
  }

  const noop = () => {};

  return (
    <RightBrowseSidebar
      game={localGame}
      library={localGame.library}
      onGameLaunch={async () => alert('Cannot launch game during FPFSS edit')}
      onDiscardClick={onDiscardGame}
      onSaveGame={onSaveGame}
      onEditGame={onEditGame}
      onFpfssEditGame={onFpfssEditGame}
      onUpdateActiveGameData={onUpdateActiveGameData}
      fpfssEditMode={true}
      isExtreme={false}
      gameRunning={false}
      onDeleteSelectedGame={noop}
      onDeselectPlaylist={noop}
      onRemovePlaylistGame={noop}
      onEditClick={noop} />
  );
}
