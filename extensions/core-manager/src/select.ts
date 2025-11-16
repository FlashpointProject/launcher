import { RootState } from 'flashpoint-launcher-renderer';
import { setExtConfigValue } from 'flashpoint-launcher-renderer-ext/actions/main';

const DEFAULT_REPO_URLS = 'https://raw.githubusercontent.com/FlashpointProject/FlashpointExtensionIndex/refs/heads/main/extindex.json';

const CONFIG_KEY_REPOS = 'core-manager.repositories';

export const selectRepoUrls = (state: RootState) => (state.main.extConfig[CONFIG_KEY_REPOS] as string) || DEFAULT_REPO_URLS;
export const setRepoUrlsAction = (repos: string) => setExtConfigValue({ key: CONFIG_KEY_REPOS, value: repos });