# preferences.json

## Overview

The `preferences.json` file holds options specific to the User and Data version that the Launcher will be using.

For deployment it is recommended to not ship with a `preferences.json` file, but instead to ship with `.preferences.default.json`. This will allow the preferences file to regenerate using the default file as a partial override to the existing defaults.

**Root folder** refers to the folder where `/Data` is located in most instances (see [config.json](config)), where your version specific data will be kept.

## Options

`registerProtocol` - Whether to register itself as the default `flashpoint://` protocol handler on startup.

`imagesFolderPath` - Relative to the root folder, stores Game images.

`logoFolderPath` - Relative to the root folder, stores the default Logos.

`playlistFolderPath` - Relative to the root folder, stores the Playlist files.

`jsonFolderPath` - Relative to the root folder, stores the `services.json`, `gotd.json` and `credits.json` files.

`htdocsFolderPath` - Relative to the root folder. Used as a base when opening Legacy game file locations, the folder used when the `-extract` mount parameter is used on Game Data, and where the `content` folder will be symlinked into when running a Curation from the Curate page.

**NOTE:** This isn't a great name, as it can be used with non-web apps pretty well. Htdocs is just our use.

`platformFolderPath` - **UNUSED**

`themeFolderPath` - Relative to the root folder. Stores all installed themes as individual folders.

`logoSetsFolderPath` - Relative to the root folder. Stores all installed logo sets as individual folders.

`metaEditsFolderPath` - **UNUSED**

`extensionsPath` - Relative to the root folder. Where to load Launcher extensions from. Currently not able to be disabled.

`dataPacksFolderPath` - Relative to the root folder. Where to download GameZIP / Game Data to.

`browsePageGameScale` - Configurable via the bottom right slider. The zoom value used on the browse page.

`browsePageShowExtreme` - A hidden override, if set to `false` then will automatically disable all extreme Playlists from showing, and enable all Extreme tag filters without user intervention.

`hideExtremeScreenshots` - Configurable via the Config page. If set to `true` then will require an extra click to view Extreme game screenshots in the sidebar. Will also disable Extreme screenshots in Screenshot Preview mode.

`enableEditing` - Configurable via the Config page. Enables the Curate page and various editing features.

`fallbackLanguage` - Configurable via the Config page. The language to use when a string is not translated to your current language.

`currentLanguage` - Configurable via the Config page. The language to use for translations.

`browsePageLayout` - Configurable via the bottom right dropdown. `0` for List view, `1` for Grid view.

`browsePageShowLeftSidebar` - Configurable via the Config page. Determines if the left sidebar on the Browse page should be visible.

`browsePageShowRightSidebar` - Configurable via the Config page. Determines if the right sidebar on the Browse page should be visible.

`browsePageLeftSidebarWidth` - Can be resized by the user. Specifies the width of the left sidebar on the Browse Page in pixels.

`browsePageRightSidebarWidth` - Can be resized by the user.  Specifies the width of the right sidebar on the Browse Page in pixels.

`curatePageLeftSidebarWidth` - Can be resized by the user. Specifies the width of the left sidebar on the Curate Page in pixels.

`showDeveloperTab` - Configurable via the Config page. Determines if the `Developer` tab should be visible in the header, and shows some Advanced config options.

`currentTheme` - Configurable via the Config page. The id of the current theme being used.

`currentLogoSet` - Configurable via the Config page. The id of the current logo set being used.

`lastSelectedLibrary` - Hidden option. The route of the last selected library (an empty string selects the default library).

`gamesOrderBy` - The last selected `order by` in the search header.

`gamesOrder` - The last selected `order direction` in the search header.

`mainWindow` - Contains position and size information for the main window. A little confusing, but stores both position and width to restore when the application launches again.

`defaultLibrary` - **UNUSED**

`saveImportedCurations` - Configurable via the Curate page. Determines whether to save a copy of curations to `/Curations/Imported` after importing them.

`keepArchiveKey` - **UNUSED**

`symlinkCurationContent` - Configurable via the Curate page. Determines whether to symlink or copy curation content to `<htdocsFolderPath>/content` (see [config.json](config)) when running (Symlink required for MAD4FP).

`onDemandImages` - Configurable via the Config page. Enables downloading missing thumbnails/screenshots from a remote server.

`onDemandImagesCompressed` - Configurable via the Config page. Determines whether to download compressed images or not.

`onDemandBaseUrl` - Hidden option. The base URL of the server to download missing thumbnails/screenshots from.

`browserModeProxy` - Configurable via the Config page. Specifies the proxy server to use during Browser Mode. Commonly used by some extensions.

`showLogSource` - Configurable via the Logs page. Allows selection of which sources to show or hide in the log.

`showLogLevel` - Configurable via the Logs page. Allows filtering of log messages by their level of importance (e.g., error, warning, info).

`excludedRandomLibraries` - Configurable via the Config page. List of libraries that should be excluded from random games list on the Home page.

`appPathOverrides` - Configurable via the Config page. Specifies application path overrides to modify specific application paths before running a game.

`tagFilters` - Configurable via the Config page. Allows setting up of tag filter groups to filter games from results, or make games and tags as extreme.

`tagFiltersInCurate` - Configurable via the Curate page. Determines whether tag filters should be applied in Curate suggestions.

`nativePlatforms` - Configurable via the Config page. Lists platforms where we want to launch a native application instead of using Wine. Linux / Mac only.

`disableExtremeGames` - Configurable via the Config page. If set, all extreme tag filters will be active and hidden, mainly for parental control purposes.

`showBrokenGames` - **UNUSED**

`shortcuts` - Defines keyboard shortcuts for various actions within the application. See [Shortcuts](shortcuts)

`onlineManual` - Hidden option. URL of the online manual for the help page of the launcher.

`offlineManual` - Hidden option. Relative or Absolute Path to the offline manual for the help page in situations without internet access.

`gameDataSources` - Hidden option. Specifies sources from which game data will be attempted to download from. Can support multiple mirrors.

`gameMetadataSources` - Hidden option. Specifies sources from which game metadata can be synced. (Shown on the home page, only 1 safely supported currently)

`fpfssBaseUrl` - Configurable via the Config page. Base URL for the FPFSS server, used for authoring actions on remote metadata.

`server` - Configurable via the Config page. The name of the server process to run. See [Services](services)

`curateServer` - Configurable via the Config page. The name of the server process to run when running curations on the Curate page. See [Services](services)

`enablePlaytimeTracking` - Configurable via the Config page. Whether to track playtime for games in the database.

`enablePlaytimeTrackingExtreme` - Configurable via the Config page. Whether to track playtime for games matching an extreme Tag filter group.

`enableVerboseLogging` - Configurable via the Config page. If enabled, shows additional logging from the Database API.

`screenshotPreviewMode` - Configurable via the Config page. If `0` (Off), show game logos for game grid thumbnails. If `1` (On) show the game logo until hovered for a certain delay (`screenshotPreviewModeDelay`) then show the game screenshot. If `2` (Always) always show game screenshots. (Unless hidden by extreme screenshot settings)

`screenshotPreviewModeDelay` - Configurable via the Config page. How long to hover a grid game before it's screenshot is shown, if `screenshotPreviewMode` is set to `1` (On)

`searchLimit` - Configurable via the Config page. The maximum number of search results to show on the browse page.