# Fix:
* Make the search bar scale down horizontally if it doesnt fit
* This file and the goal file should be merged or something
## Linux
* automatically extract ./flashplayer from flash_player_sa_linux.x86_64.tar.gz
* set the http_proxy env

# Add:
* A "Random Game" button that takes you to a random game in the games list
* Make use of the tag capabilities of the search bar (for filtering genres, developers etc.)
* Make the application fully controllable using the keyboard only (set tab indices, select borders etc.)
* Show the number of games shown with the current filters
* Add an icon to use for the executable (other than the default Electron one)?
* Favorite Games (Maybe not?)
  - Add the ability to flag and un-flag games as Favorite
  - Add a way to filter out all non-favorites in the games list (Maybe?)
  - Display a "Favorite" icon next to all favorite games in the games list (A small star?)
* Game List Context Menu
  - Show a context menu when right clicking a game in the games list
  - The context menu should contain:
    * Launch (normal launch - same as double click)
    * Additional launches (all Additional Applications for that game)
    * Favorite / Un-favorite (toggles the games favorite flag)
    * Remove game

## New Format
### Why:
* Increased parsing performance
  - Even if importing games form LaunchBox, the games can be cached for better performance
* Smaller file-size (the XMLs are very bloated)
* Can be easily converted to and from the "CurationFormat"
### Goals:
* Make it convertible to and from:
  - the "CurationFormat"
  - Launchbox XMLs
* Split "static" and "private" information into separate files (Don't store a games _Title_ and _Developer_ in the same file as _Favorite_ and _Rating_)
