type Changelog = {
  [key: string]: ChangelogEntry;
};

type ChangelogEntry = {
  title: string;
  message: string;
}

export const CHANGELOG: Changelog = {
  "2025-02-10": {
    title: 'Flashpoint Launcher 13.1.0',
    message: `
# Flashpoint Launcher 13.1.0

## New
- Game Data:
  - When launching a game, if there is existing game data and there has been new game data added via a metadata update, then the user is asked whether it should update to the new game data or stay on the existing one
    - If the launch command has changed in the new game data, the user is warned that updating could cause existing save data to break
- Playlists:
  - Playlists can now utilize all search features
  - Playlist ordering can disabled to use the traditional ordering dropdowns inside them
  - You can now create Playlists from the current Search Results
- Search Pages:
  - Checkbox selections for - \`Installed\`, \`Legacy Game\`, \`Use Playlist Order\`
  - Dropdowns selections for - \`Library\`, \`Developer\`, \`Publisher\`, \`Series\`, \`Play Mode\`, \`Platform\` and \`Tags\`
  - Config option - \`Restore Search Results\` (default: **on**) - Automatically saves each Search Page and restores them when the launcher opens. (text, advanced filters, selected playlist and selected game)
  - Config option - \`Use Custom Search Views\` (default: **off**) - Enables the use of Custom Search Views. These will replace the Library search page tabs and instead give you a Library filter option on the Custom Search pages. You can create (plus icon), delete, rename (right click them) and drag to change the order of them in the Header.
  - \`Ctrl + F\` will now focus the Search Bar when on a Search Page
- Extensions:
   - \`getAccessToken()\` - Returns the FPFSS access token for the logged in user to allow extensions to perform actions on their behalf. User will be prompted to allow or deny when called. (#444)
   - \`DialogState\` now contains an \`mdx\` boolean field. Setting this to true will compile and run the message as MDX. (Markdown + JSX)
- Ruffle:
  - Config option - \`Enabled (Supported Games)\` (default: **off**) - Enables games marked with the \`Ruffle Support\` metadata field to use the Ruffle emulator instead of Flash Player.
  - Config option - \`Enabled (Unsupported Games)\` (default: **off**) - Enables games to use the Ruffle emulator instead of Flash Player, no matter the support indicated in the games metadata.

## Changed
- Search Bar has been moved from the Header to the Browse page
- \`Ctrl+Shift+R\` to reload the window will now also reload all extensions (#445)
- Linux:
  - Wine installations bundled inside FPSoftware are now automatically added to PATH for launched games (#430)
- Importing games in the Curate tab now uses 7zip instead of Bluezip

## Fixed
- Non-unicode characters inside preferences no longer prevent the Preferences file from saving
- Search results are now correctly ordered with case insensitivity
- Existing path values are no longer wiped from existing Game Data when a Game has a metadata update
- Launching a game can now recover the path value when it is missing, preventing a launch error
- 401 errors from Fpfss functions should now properly get the user to re-authenticate instead of throwing an error
- Closing processes will work again on new Windows distributions without WMIC installed
- New platforms now correctly sort alphabetically on the Extras box of the Home page
- Multiple blacklist conditions now properly use AND comparisons
- Additional Apps now use the same proc launch function as Game with a randomized ID instead
- Joint clauses (Application Path + Launch Command) now properly use inner ORs for blacklist conditions
- \`Open Flashpoint Manager\` will now wait 2.5 seconds to fully open FPM before exiting the main process. Cheap, but effective

# Removed
- Playlists can no longer have multiple copies of the same game.
- Bluezip is no longer included as an external tool
`
  },
  "2024-04-04": {
    title: 'Flashpoint Launcher 13.0.1',
    message: `
# Flashpoint Laucnher 13.0.1

## New
- Ctrl+Shift+R will now restart the renderer, without restarting the backend. Good for local dev.

## Changed
- Tags and Platforms blacklists are treated as an OR despite the rest of the query being treated as an AND. This should make it easier to exclude several tags at once

## Fixed
- Primary platform not causing a meta.yaml update
- Starting a search by clicking on a right sidebar field incorrectly retains the search result count of the previous query
- Race condition causing service info to not be synced correctly introduced in the last update
- Tags / platforms not being added to a curation when entering their alias
- Platforms not being added to a curation where the platform exists but has zero associated game entries
`
  },
  "2024-03-29": {
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
  "2023-09-30": {
    title: "Flashpoint Launcher 12.1.1",
    message: `
# Flashpoint Launcher 12.1.1

Minor fixes for Flashpoint Manager integration

Added archive state variables

Fix tags page stutter @prostagma-fp 
    `
  },
  "2023-07-12": {
    title: "Flashpoint Launcher 12.0.0",
    message: `
# Flashpoint Launcher 12.0.0

I'll update this later down the line - This includes a massive amount of changes.

Future self note: Idiot never did.
    `
  },
  "2022-10-10": {
    title: "Flashpoint Launcher 10.1.7",
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
