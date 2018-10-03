# Fix:
* Make the search bar scale down horizontally if it doesn't fit the screen
* Hide overflow of .root (CSS)
* Fix bug where the thumbnails/screenshots are fetched before the ImageCollections are set up (and therefore dont find any images)

# Todo:
* Add support for custom themes
  - A new JSON file should contain colors, font names, font sizes etc. to be used in the launcher
  - A new page / popup window should let the user easily change these values in real time
* Add Wine support for Linux
  - Use wine automatically for Shockwave (since it has no official linux support) 
  - Make using Wine for Flash optional (the linux projector is apparently notably buggy)
  - Find out other things that could run with Wine (?)
  - Wine respects the ``http_proxy`` environment variable just like the Flash projector for Linux
* Add more fields to GameInfo / BrowseSidebar
  - Publisher
  - DateAdded (Date-time-stamp of when the game was added to the collection)
* Add drop-down menus for filtering Genre(s) and Platform(s) next to the search-bar
  - The drop-down menus should have all Genres/Platforms listed
  - They should be "multi-select" so you can pick any number of them
  - By default none should be selected (which has the same filtering properties as selecting all)
* Add a game playlist/collection system
  - Playlists should have these things:
    * Title
    * Description
    * Author
    * Banner / Icon
    * Array of games
    * ... (more stuff?)
  - Each game in a playlist should have:
    * Notes (Why the game is in the playlist?)
    * ... (more stuff?)
  - Each game can belong to any number of collections
  - All collections a game belongs to should be visible in the sidebar (if any)
  - Add a way to show only the games of a playlist at the browse page
* An option to show screenshots instead of logos (just a toggle at the settings page)
* Remember the scroll position and selected game of the BrowsePage when changing page
* Remember the windows previous size and position between sessions
* A visual divider between categories (when ordering by Genre, Developer etc.)
  - Some visual indicator should remain on the screen after scrolling past a divider 
    (since some categories are way taller than the window)
* A way to toggle the sidebar at BrowsePage (a button in the header, and a keyboard shortcut?)
* More ways to order games by (Developer, Series etc.)
* A button that selects a random game when pressed (an maybe a keyboard shortcut?)
* Replace the Icon of the application (with the Flashpoint icon?)
* Context Menu (Right-click menu)
  - Game List/Grid Item:
    * Launch (normal launch - same as double click)
    * Additional launches (list all Additional Applications for that game)
    * Remove Game
  - Logs:
    * Clear (remove everything from the log)
    * Copy (to clipboard)
* Make the launcher fully controllable using only the keyboard
  - Move selection with TAB and the arrow keys
  - Enter to "press" selected element
  - etc.
* Add a HelpPage (or show how to do this stuff somewhere else?)
  - How to filter by Platform (!), Developer (@) and Genre (#) with special characters
  - Show keyboard shortcuts (once there are more - there's currently only ``CTRL+SHIT+I`` for toggling DevTools)
* Make changes to the GameCollection savable to the XML it was loaded from

# Pimp:
* Rework the AboutPage
* Custom scroll-bars (Maybe?)
