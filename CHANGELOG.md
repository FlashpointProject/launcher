# Release 9.0.3

## Fixed

- Adding a game to a playlist now puts it at the end of the playlist (instead of at the beginning).
- It is no longer possible to add a game to a playlist it is already in.
- `content` folder is now created when loading curation meta files.

# Release 9.0.2

## New

- Added `Random Libraries` checkbox dropdown to the Config page.
- Added `excludedRandomLibraries` to `preferences.json`.

## Changed

- Random Picks no longer re-rolls every time you visit the Home page.
- Reduce the delay for the most recently selected game to appear in the right sidebar when changing selection rapidly.
- A folder is now considered a valid "Flashpoint folder" if it contains a file or folder named ``FPSoftware``.
  -  This is instead of checking for ``Data/Platforms`` (since that folder is getting dropped from Flashpoint).

## Fixed

- Playlists can now be edited after a previous edit of the same playlist has been discarded.

# Release 9.0.1

## New

- A custom version can be shown in the Title Bar. Reads from `/version.txt` at the root of the Flashpoint data path.

# Release 9.0.0

## New

### Database

- The launcher now uses an SQLite database to store games (meta data), playlist and tags. This is used instead of the platform XML and playlist JSON files.
    - The database file is stored at `/Data/flashpoint.sqlite`

### Tags

- Tags are now assigned Tag Categories.
  - Tag Categories is a new way to group tags together.
  - The category a tag belongs to determines the ordering, icon and color of that tag (in various places).
- Tags can now have multiple aliases.
  - Each tag has one alias assigned as its primary alias.
- Tags can now be merged into other tags.
    - Source tags aliases can be optionally merged as aliases of the target tag.
- Tag Suggestions will be shown when adding tags in the order of how many games they belong to, then alphabetically.
- Added a `Tags` page (hidden while editing is disabled).
- Added a `Categories` page (hidden while editing is disabled).

### On Demand Images

- Game images can now be downloaded on demand.
- Added `onDemandBaseUrl` to `config.json`.
- Added `onDemandImages` to `preferences.json`.

### Home Page

- Added `Re-Roll Picks` button to Random Picks.

### Browse Page

- Added `Export Meta Edit` button to the context menu of Games. Clicking it will bring up the new "Meta Edit Exporter" which lets you export partial meta data from the game.
- Added `Copy Game UUID` button to the context menu of Games.
- Added `Duplicate Playlist` button to the body and context menu of Playlists.
- Added `Export Playlist` button to the body and context menu of Playlists.
- Added `Import Playlist` button at the bottom of the left sidebar.

### Logs Page

- Logs can now be shared by pressing the `Upload Logs` button. This will default to https://logs.unstable.life/ and copy the resulting URL to your clipboard
    - Note - These are publicly viewable. You will be warned before uploading.
- Added `logsBaseUrl` to `config.json`.

### Config Page

- Added `On Demand Images` toggle.
- Added `Server` dropdown (restart required).
- Added `Metadata Server Host` input field (not used for anything yet).

### Curation page

- Add-App Launch Commands are now validated.
    - They are not colored like the Launch Command of the game for technical reasons. May be changed in the future.
- Curations can now be run with MAD4FP enabled if a MAD4FP server is present in services.json.
    - The server will automatically swap back when running a game or curation normally.
- Now shows the number of results of the current search in the bottom left corner.
- Curation content folders can now link via Symlink instead of Copying. This is required for MAD4FP but will trigger UAC prompts on Windows.
- Curations now auto-save metadata every 10 seconds. Should prevent big data losses on crash.

### Developer Page

- Added `Import Legacy Platforms` button.
- Added `Import Legacy Playlists` button.
- Added `Import Tags` button (unsafe, be careful when using it).
- Added `Export Tags` button (unsafe, be careful when using it).
- Added `Import Meta Edits` button.

### Misc

- Added `updatesEnabled` to `config.json`. If set to false the update check on launch will be skipped.

## Changed

- The switch to an SQLite database (from XML / JSON files) decreases the RAM usage and enables the launcher to store way more games!
- Curations are assigned a UUID on creation. This kept in the metadata and will be the same as the Game UUID when imported.
    - If loading a pre-9.0.0 curation this will be generated when loaded onto the Curate page.
- Tags are no longer strings stored in Games, but their own separate entities.
- Random Picks now shows 5 games instead of 6, for consistent styling.
- Extreme and Broken (in Infinity) checkboxes in the right sidebar are now hidden unless editing.
- Credit colors are no longer hard coded and roles can be used as headings. Check the credits.json documentation to add them there.
- Playlists can now be edited independent of the "Enable Editing" config.

## Fixed

- Curations now always load the meta before images. This should prevent rare cases where meta was overwritten by defaults.
- Launch command validation on the Curate page now ignores URL options.
- Fixed several issues related to Games and Playlists not saving or deleting properly.
- Left sidebar now shows the correct plural noun for `All <library>` (E.G "All Games", "All Animations").
- Partial searches now work for Japanese titles.
- The floating box on the Curate Page no longer overlaps the Footer when the window is too short.

## Removed

- Removed `Redirector` row from the Config page.
- Removed the quick search feature (for technical reasons).
    - Quick search was the ability to type anything (at the Browse page) and the launcher would select and scroll to the game with the typed title.
- Curation metadata can no longer be externally edited while the launcher is running. This is to allow for auto-save functionality.

## Breaking Changes

- Platform XMLs are no longer supported.
    - They can be imported to the database by using the `Import Legacy Platforms` button on the Developer page.
- Playlist JSON files are no longer loaded on startup.
    - They can be imported to the database by using the `Import Legacy Playlists` button on the Developer page.
    - They can also be imported individually by using the `Import Playlist` button at the Browse page.
- The structure of `services.json` has been changed. Please check the documentation to update it.