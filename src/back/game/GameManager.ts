import { ServerResponse, FetchGameRequest, SearchQuery, MetaUpdate, GameAppDeleteRequest } from '../../shared/game/interfaces';

const UNIMPLEMENTED_RESPONSE: ServerResponse = {
  success: false,
  error: 'Unimplemented Function',
  result: undefined
}

export class GameManager {
  public loadPlatforms(platformsPath: string): void {

  }

  public findGame(request: FetchGameRequest): ServerResponse {
    // @TODO Implement Functionality
    return UNIMPLEMENTED_RESPONSE;
  }

  public searchGames(request: SearchQuery): ServerResponse {
    // @TODO Implement Functionality
    return UNIMPLEMENTED_RESPONSE;
  }

  public deleteGameOrApp(request: GameAppDeleteRequest): ServerResponse {
    // @TODO Implement Functionality
    return UNIMPLEMENTED_RESPONSE;
  }

  public updateMetas(request: MetaUpdate): ServerResponse {
    // @TODO Implement Functionality
    return UNIMPLEMENTED_RESPONSE;
  }
}