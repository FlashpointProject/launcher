import { BackIn } from '../../shared/back/types';
import { sendRequest } from '../../shared/back/util';
import { FetchGameResponse, IGameInfo, MetaUpdate, SearchRequest } from '../../shared/game/interfaces';

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

  export function fetchGame(id: string): Promise<FetchGameResponse> {
    return sendRequest(BackIn.FIND_GAME, id);
  }

  export function updateMeta(update: MetaUpdate): Promise<void> {
    return sendRequest(BackIn.UPDATE_META, update);
  }

  export function searchGames(searchRequest: SearchRequest) {
    return sendRequest<IGameInfo[]>(BackIn.UPDATE_META, searchRequest);
  }
}
