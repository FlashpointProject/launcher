type Changelog = {
  [key: string]: ChangelogEntry;
};

type ChangelogEntry = {
  title: string;
  message: string;
}

export const CHANGELOG: Changelog = {
  '2025-02-10': {
    title: 'Flashpoint Launcher 14.0.0',
    message: `
# Flashpoint Launcher 14.0.0

# New
- **Games:**
  - When launching a game, if there is existing game data and there has been new game data added via a metadata update, then the user is asked whether it should update to the new game data or stay on the existing one
    - If the launch command has changed in the new game data, the user is warned that updating could cause existing save data to break
  - Play / Download button now additional dropdown options for Flash games which will override Ruffle settings:
    - \`Run with Flash Player\` - Force the game to use the default launch command
    - \`Run with Ruffle\` - Force the game to use Ruffle. This will change to tell you if the game is not marked as Supported by Flashpoint.
- **Playlists:**
  - Playlists can now utilize all search features
  - Playlist ordering can disabled to use the traditional ordering dropdowns inside them
  - You can now create Playlists from the current Search Results. (Very large results views will cause significant lag when being created or viewed)
- **Search:**
  - Checkbox selections for - \`Installed\`, \`Legacy Game\`, \`Use Playlist Order\`
  - Dropdowns selections for - \`Library\`, \`Developer\`, \`Publisher\`, \`Series\`, \`Play Mode\`, \`Platform\` and \`Tags\`
    - Dropdown selections can include or exclude individual items, as well as toggle between \`AND\` / \`OR\` search operations
  - New keybinds:
    - \`Ctrl+F\` - Focus the search bar
    - \`Ctrl+D\` - Clear the search text
    - \`Ctrl+Shift+D\` - Clear the search text and filters
- **Extensions:**
   - \`getAccessToken()\` - Returns the FPFSS access token for the logged in user to allow extensions to perform actions on their behalf. User will be prompted to allow or deny when called. (@dot-mike)
   - \`DialogState\` now contains an \`mdx\` boolean field and \`textAlign\` string field. Setting this to true will compile and run the message as MDX. (Markdown + JSX)
- **Misc:**
  - About Page now has viewable launcher changelogs
  - DNS over HTTPS via Cloudflare is now supported for all Launcher web requests. This should fix some connectivity issues in countries with overly aggressive censorship such as the Philippines.
- **Config Options:**
  - \`Restore Search Results\` - (default: **on**) - Saves and restore a copy of each search page (text, filters, selected game and playlist) whenever you open the application.
  - \`Restore Search View Text\` - (default: **on**) - Restores the text field of a search view when restarting the launcher.
  - \`Enable Custom Search Views\` - (default: **off**) - Replaces the Library search tabs with custom named search tabs and adds a Library option to the advanced filters.
  - \`Default Opening Page\` - (default: **Home**) - Default page to open to, either the Home Page or a chosen Search Page
  - \`Hide New View Button\` - (default: **off**) - When using custom views, hide the new view (+) button in the header. You can instead press 'Create New Search View' under the context menu for tabs.
  - \`Auto-Clear WinINet Cache\` - (default: **off**) - Automatically clear the Windows web cache when running a curation from the Curate tab.
  - \`Clear WinINet Cache\` - (button) - Clears Windows web cache, which may help resolve loading issues in curations and other rare cases.
  - Ruffle - \`Enable (Supported Games)\` - (default: **off**) - Enable Ruffle for games that have been marked as properly supported.
  - Ruffle - \`Enable (Unsupported Games)\` - (default: **off**) - Enable Ruffle Standalone for all games regardless of whether they have been checked as supported. Results my vary.

# Changed
- Search Bar has been moved from the Header to the Browse page (Search Views)
- Clear Search Button can now clear both text and filters if Shift is held while clicking it.
- \`Ctrl+Shift+R\` to reload the window will now also reload all extensions (@dot-mike)
- Linux:
  - Wine installations bundled inside FPSoftware are now automatically added to PATH for launched games (@Maoijoon)
- Importing games in the Curate tab now uses 7zip instead of Bluezip
- Tags page now follows a custom sort order, starting with default.
- All web request from the launcher use a consistent user agent (@dot-mike)

# Fixed
- Non-unicode characters inside preferences no longer prevent the Preferences file from saving
- Search results are now correctly ordered with case insensitivity
- Existing path values are no longer wiped from existing Game Data when a Game has a metadata update
- Launching a game can now recover the path value when it is missing, preventing a launch error
- 401 errors from Fpfss functions should now properly get the user to re-authenticate instead of throwing an error
- Closing processes will work on new Windows distributions without WMIC installed
- New platforms now correctly sort alphabetically on the Extras box of the Home page
- Multiple blacklist conditions now properly use AND comparisons
- Additional Apps now use the same proc launch function as Game with a randomized ID instead
- Joint clauses (Application Path + Launch Command) now properly use inner ORs for blacklist conditions
- \`Open Flashpoint Manager\` will now wait 2.5 seconds to fully open FPM before exiting the main process. Cheap, but effective.

# Removed
- Search bar no longer has \`tag:\` autocomplete. This may return in the future, the tags filter dropdown should be a reasonable replacement.
- Playlists can no longer have multiple copies of the same game.
- Bluezip is no longer included as an external tool
`
  },
  '2024-03-29': {
    title: 'Flashpoint Launcher 13.0.0',
    message: `
# Flashpoint Launcher 13.0.0

* **Significantly faster search times**
* Ordering by Last Played or Playtime now behaves like a history page by excluding games with no playtime from the search results.
* Improved search capabilities
  * Date comparisons for \`dateAdded\`, \`dateModified\`, \`releaseDate\` and \`lastPlayed\` (e.g \`releaseDate=2009\`)
  * Numerical comparisons for \`tags\`, \`platforms\`, \`addApps\`, \`gameData\`, \`playCount\` and \`playtime\` (e.g \`tags>3\`)
    * Date and Numerical comparisons support \`>\`, \`<\` and \`=\` comparators (\`:\` is equal to \`=\`)
  * Numerical values support time values, e.g \`playtime>1h30m\` for **s**ecs, **m**ins, **h**ours, **d**ays, **w**eeks, **M**onths and **y**ears.
* Search results can now also be ordered by \`Release Date\` and \`Platform\`
* Improved log page visuals **(Theme authors will need to update)**
* More information about the boot sequence is included in the logs page
* Verbose logging (enabled via Config page) to display detailed database queries and launcher event execution time.
* Game context menu buttons to:
  * Show Logos / Screenshots in Explorer
  * Delete individual game playtime tracking data
* Playlists now respect active Tag Filter Groups
* Playtime tracking no longer modifies Date Modified
* Grid view is now the default, you can change back to List with the bottom right dropdown
* Simplified extension API interactions with tags and platforms** (Extension authors may need to update, consider using the @fparchive/flashpoint-archive npm package)**
* Game configurations (middleware) are no longer supported. The functionality will be reintroduced at a later date.
* Fixed tags / tag categories not being editable via their respective pages.
    `
  },
  '2023-09-30': {
    title: 'Flashpoint Launcher 12.1.1',
    message: `
# Flashpoint Launcher 12.1.1

Minor fixes for Flashpoint Manager integration

Added archive state variables

Fix tags page stutter @prostagma-fp 
    `
  },
  '2023-07-12': {
    title: 'Flashpoint Launcher 12.0.0',
    message: `
# Flashpoint Launcher 12.0.0

I'll update this later down the line - This includes a massive amount of changes.

Future self note: Idiot never did.
    `
  },
  '2022-10-10': {
    title: 'Flashpoint Launcher 10.1.7',
    message: `
# Flashpoint Launcher 10.1.7

## Changed
- Tag Searches (Whitelist) will use AND comparison rather than OR
- Hidden WINE fixme messages from logs
- Removed PHP check on Mac

## Fixed
- Random Dialog opening after closing an extension dialog. Hopefully? Fingers crossed.
- onDidUpdatePlaylist and onDidUpdatePlaylistGame events should trigger for more scenarios than before
- Various Mac PATH fixes
    `
  }
};
