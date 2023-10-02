# Middleware

Extensions can provide middleware which a user can choose to apply before a game launches. This can be useful for modifying game files, creating new files or modifying launch options before a game starts.

## Changing Launch Info

Whilst this can already be achieved globally via `onWillLaunchGame` and `onWillLaunchAddApp`, a preference should be made to use middleware unless intended to apply to every game without question.

## Replacing Existing Game Files

`Legacy/htdocs/content/` acts a second root directory to `Legacy/htdocs/`. 

E.G `http://example.com/game.txt` would check in the order:
 `Legacy/htdocs/content/example.com/game.txt`, then any loaded gamezips, then `Legacy/htdocs/example.com/game.txt`

You can either write these directly yourself, or use the utility functions to create or copy files.

- `writeServedFile` - Writes data to a file e.g `example.com/game.txt`
- `writeServedFileByUrl` - Writes data to a file based on a URL, e.g `http://example.com/game.txt` writes to `example.com/game.txt`. Useful when overriding launch commands.
- `copyServedFile` - Copies a file to the specified path e.g `example.com/game.txt`

## Developer Notes

- Goals
  - Overview
    - Individual game configurations with several applied middleware
    - Allow multiple game configurations to be stored
      - Store ownership to support easy sync (local, remote server etc)
    - Extension support to create middleware
      - Use system extensions for 'built-in' middleware
  - File and launch info modification support
    - Support creating new files to serve over proxy
    - Support overriding existing files to serve over proxy
    - Allow modification of launch info (similair to onWillLaunchGame)
      - Launch info should be runtime validated by launcher before game launch
    - Allow specific orders of execution for middleware, with individual middleware configs.
  - Detailed middleware configuration
    - Create new config schemas (use existing dialog options code)
    - Return the correct config schema based on the factors given by the game's configuration
      - Chosen middleware version
      - Launch Command(?)
      - Platform(?)
    - Support upgrading old configs where older versions are not supported anymore
    - User can modify this configuration inside the launcher using simple dialogs
      - Raw JSON support? Would this be too difficult to validate?
    - Allow middleware to be enabled or disabled in the game's configuration, without removing anything

- Middleware shape
  - Get config schema given parameters e.g
    - Version
    - Platform(?)
    - Launch Command(?)
  - Validate config(?) (optional)
  - Check enabled state based on existing game info or config(?)
  - Execution method
    - Runtime validation of returned launch info

- Served file overrides any existing file in gamezip or htdocs

- Utility functions
  - Write served file by path
  - Write served file by url
  - Copy served file by path
  - Copy served file by url
  - Extract file from game zip by path
  - Extract file from game zip by url