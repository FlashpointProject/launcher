import { RootState } from 'flashpoint-launcher-renderer';
import { setExtConfigValue } from 'flashpoint-launcher-renderer-ext/actions/main';

const DEFAULT_REPO_URLS = 'https://raw.githubusercontent.com/FlashpointProject/FlashpointExtensionIndex/refs/heads/main/extindex.json';
const DEFAULT_COMPONENT_ROOTS_URLS = 'https://nexus-dev.flashpointarchive.org/repository/components-stable/components.xml';

const CONFIG_KEY_REPOS = 'core-manager.repositories';
const CONFIG_KEY_COMPONENT_ROOTS = 'core-manager.component-roots';

export const selectRepoUrls = (state: RootState) => (state.main.extConfig[CONFIG_KEY_REPOS] as string) || DEFAULT_REPO_URLS;
export const setRepoUrlsAction = (repos: string) => setExtConfigValue({ key: CONFIG_KEY_REPOS, value: repos });
export const selectComponentRootUrls = (state: RootState) => (state.main.extConfig[CONFIG_KEY_COMPONENT_ROOTS] as string) || DEFAULT_COMPONENT_ROOTS_URLS;