import { BackIn } from '../../shared/back/types';
import { FetchGameResponse, MetaUpdate, SearchRequest, SearchResults, ServerResponse } from '../../shared/game/interfaces';
import { PlatformInfo } from '../../shared/platform/interfaces';

export namespace GameManager {
  export const SEARCH_ALL_GAMES: SearchRequest = {
    offset: 0,
    limit: 0,
    query: '',
    orderOpts: {
      orderBy: 'title',
      orderReverse: 'ascending'
    }
  };

  export async function loadManager(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      window.External.backSocket.send(BackIn.LOAD_GAMEMANAGER, undefined, (response) => {
        const res: ServerResponse = response.data;
        if (res.success) {
          resolve();
        } else {
          reject(res.error);
        }
      });
    });
  }

  export async function fetchPlatforms(): Promise<PlatformInfo[]> {
    return new Promise<PlatformInfo[]>((resolve, reject) => {
      window.External.backSocket.send(BackIn.GET_PLATFORMS, undefined, (response) => {
        const res: ServerResponse = response.data;
        if (res.success) {
          const platforms: PlatformInfo[] = res.result;
          resolve(platforms);
        } else {
          reject(res.error);
        }
      });
    });
  }

  export async function fetchGame(id: string): Promise<FetchGameResponse> {
    return new Promise<FetchGameResponse>((resolve, reject) => {
      window.External.backSocket.send(BackIn.FIND_GAME, id, (response) => {
        const res: ServerResponse = response.data;
        if (res.success) {
          const game: FetchGameResponse = res.result;
          resolve(game);
        } else {
          reject(res.error);
        }
      });
    });
  }

  export async function updateMeta(update: MetaUpdate): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      window.External.backSocket.send(BackIn.UPDATE_META, update, (response) => {
        const res: ServerResponse = response.data;
        if (res.success) {
          resolve();
        } else {
          reject(res.error);
        }
      });
    });
  }

  export async function searchGames(searchRequest: SearchRequest) {
    return new Promise<SearchResults>((resolve, reject) => {
      window.External.backSocket.send(BackIn.SEARCH_GAMES, searchRequest, (response) => {
        const res: ServerResponse = response.data;
        if (res.success) {
          const results: SearchResults = res.result;
          resolve(results);
        } else {
          reject(res.error);
        }
      });
    });
  }
}