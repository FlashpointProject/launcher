# Fix:
* Make all game thumbnails work (almost all are found and displayed, but not all)
  - Make the renderer try several file endings (.jpg, .gif etc.) instead of just.png
  - Make the renderer try several indices (count up until found or gives up) instead of just 1
* Make the games in the game list look better (pimp 'em boii - even more yo!)
* Make the search bar scale down horizontally if it doesnt fit
* Scroll the GameList to the top when a search is made

## Linux

* automatically extract ./flashplayer from flash_player_sa_linux.x86_64.tar.gz
* set the http_proxy env

# Add:
* Load games from all LaucnhBox Platform XML files instead of just the flash one
* Make use of the tag capabilities of the search bar (for filtering genres, developers etc.)
* Make the application fully controllable using the keyboard only (set tab indices, select borders etc.)
* Show the number of games shown with the current filters
* Add a way to scale the games in the game list up and down (maybe have a scale slider in the footer?)
* Add an icon to use for the executable (other than the default Electron one)?
* Favorite Games (Maybe not?)
  - Add the ability to flag and unflag games as Favorite
  - Add a way to filter out all non-favorites in the games list (Maybe?)
  - Display a "Favorite" icon next to all favorite games in the games list (A small star?)
* Game List Context Menu
  - Show a context menu when right clicking a game in the games list
  - The context menu should contain:
    * Launch (same as double click)
    * (Un)Favorite (toggles the games favorite flag)
    * Edit (opens a menu where the game's properties can be edited)

## New Format
### Goals:
* Make it easily convertable from both the "CurationFormat" and LaunchBox XMLs
* Split "static" and "private" information into separate files (Don't store a games _Title_ and _Developer_ in the same file as _Favorite_ and _Rating_)

