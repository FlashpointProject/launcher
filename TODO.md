# Fix:
* Make all game thumbnails work (almost all are found and displayed, but not all)
  - Make the renderer try several file endings (.jpg, .gif etc.) instead of just.png
  - Make the renderer try several indices (count up until found or gives up) instead of just 1
* Make the games in the game list look better (pimp 'em boii - even more yo!)
* Make the search bar scale down horizontally if it doesnt fit

# Add:
* Load games from all LaucnhBox Platform XML files instead of just the flash one
* Make use of the tag capabilities of the search bar (for filtering genres, developers etc.)
* Add drop-down menus next to the search bar with filter and order settings.
  - One should select what to order after (Name alphabetically, Genre, ???)
  - One should select ascending / descending
* Show the number of total games, and the number of games shown with the current filters
