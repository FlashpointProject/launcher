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
* Show the number of games shown with the current filters
* Add a way to scale the games in the game list up and down (maybe have a scale slider in the footer?)
* Make custom title bar optional
