import { ApiEmitter } from '@back/extensions/ApiEmitter';
import { CurationImportState } from '@back/importGame';
import { Game, GameData, Playlist, PlaylistGame, ServiceChange } from 'flashpoint-launcher';

export const onWillImportCuration: ApiEmitter<CurationImportState> = new ApiEmitter<CurationImportState>();
export const onDidInstallGameData = new ApiEmitter<GameData>();
export const onWillUninstallGameData = new ApiEmitter<GameData>();
export const onDidUninstallGameData = new ApiEmitter<GameData>();
export const onDidUpdateGame = new ApiEmitter<{oldGame: Game, newGame: Game}>();
export const onDidRemoveGame = new ApiEmitter<Game>();
export const onDidUpdatePlaylist = new ApiEmitter<{oldPlaylist: Playlist, newPlaylist: Playlist}>();
export const onDidUpdatePlaylistGame = new ApiEmitter<{oldGame: PlaylistGame, newGame: PlaylistGame}>();
export const onDidRemovePlaylistGame = new ApiEmitter<PlaylistGame>();
export const onServiceChange = new ApiEmitter<ServiceChange>();
