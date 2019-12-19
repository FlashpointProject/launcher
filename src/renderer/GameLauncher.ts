import { ChildProcess, exec, ExecOptions } from 'child_process';
import { remote } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as which from 'which';
import { IAdditionalApplicationInfo, IGameInfo } from '../shared/game/interfaces';
import { ExecMapping } from '../shared/interfaces';
import { LangContainer } from '../shared/lang';
import { fixSlashes, padStart, stringifyArray } from '../shared/Util';

type IGamePathInfo = Pick<IGameInfo, 'platform' | 'launchCommand'>;

export class GameLauncher {
  /** Path of the "htdocs" folder (relative to the Flashpoint folder) */
  private static htdocsPath = 'Server/htdocs';
  /** Exec mappings between platforms */
  private static execMappings: ExecMapping[] = [];

  /**
   * Replaces the current exec mappings object
   * @param data Exec mappings object
   */
  public static setExecMappings(data: ExecMapping[]): void {
    this.execMappings = data;
  }

  public static getExecMappings(): ExecMapping[] {
    return this.execMappings;
  }

  /**
   * Checks whether the platform is native locked
   * @param platform Platform name
   */
  public static isPlatformNativeLocked(platform: string) {
    return window.External.config.data.nativePlatforms.findIndex((item) => { return item === platform; }) != -1;
  }

  /**
   * Try to get the ("entry"/"main") file path of a game.
   * Because how the file's path is declared in the launch command between different games and platforms,
   * this function may fail (and return undefined).
   * @param game Game to get path from.
   * @returns The file path of the game (or undefind if no file path could be extracted).
   */
  public static getGamePath(game: IGamePathInfo): string | undefined {
    // @TODO Because some strings can be interpreted as different paths/URLs, maybe this should return an array
    //       of strings with all the possible paths of the "main" file?
    //       Example: Some web server files are stored in "Server/htdocs" while other are stored in "Server/cgi-bin".
    const ffpPath = window.External.config.fullFlashpointPath;
    const htdocsPath = GameLauncher.htdocsPath; // Short-hand
    const shockwavePath = 'FPSoftware/Shockwave/PJX'; // (Path to a shockwave executable)
    const groovePath = 'FPSoftware/3DGrooveGX'; // (Path to the 3D Groove GZ executable)
    // Extract file path from the game's launch command
    const platform = game.platform.toLowerCase();
    switch (platform) {
      // Example: 5.x http://example.com/games/cool_game.html
      case 'unity': {
        // Extract the URL (get the content after the first space, or the whole string if there is no space)
        let str: string | undefined = undefined;
        const index = game.launchCommand.indexOf(' ');
        if (index >= 0) { str = game.launchCommand.substring(index + 1); }
        else            { str = game.launchCommand; }
        // Create URL
        const url = toForcedURL(str);
        if (url) { return path.join(ffpPath, htdocsPath, urlToFilePath(url)); }
      } break;
      // Relative path to a ".ini" file
      // Example: game.ini
      case '3d groove gx':
        return path.join(ffpPath, groovePath, game.launchCommand);
      // Examples: -J-Dfile.encoding=UTF8 -J-Duser.language=ja -J-Duser.country=JP http://www.example.jp/game.html
      //           http://www.example.com/game.html
      //           "http://www.example.com/game.html"
      case 'java': {
        // Extract the path/url from the launch command
        let str: string | undefined = undefined;
        if (game.launchCommand[0] === '"') { // (URL wrappen in quotation marks)
          // Get the contents between the first pair of quotation marks
          const index = game.launchCommand.indexOf('"', 1);
          if (index >= 0) { str = game.launchCommand.substring(1, index); }
        } else {
          // Get the content after the last space (or the while string if there is no space)
          const index = game.launchCommand.lastIndexOf(' ');
          if (index >= 0) { str = game.launchCommand.substring(index); }
          else            { str = game.launchCommand; }
        }
        // Create a full path from the extracted url
        if (str !== undefined) {
          const url = toForcedURL(str);
          if (url) { return path.join(ffpPath, htdocsPath, urlToFilePath(url)); }
        }
      } break;
      // Examples: http://example.com/game.dcr --forceTheExitLock 0
      //           "http://example.com/game.dcr" --do "member('gameUrl').text = 'http://example.com/other_thing.dcr'"
      //           ..\Games\game_folder\game_file.dcr
      case 'shockwave': {
        // Extract the path/url from the launch command
        let str: string | undefined = undefined;
        if (game.launchCommand[0] === '"') { // (Path/URL wrappen in quotation marks)
          // Get the contents between the first pair of quotation marks
          const index = game.launchCommand.indexOf('"', 1);
          if (index >= 0) { str = game.launchCommand.substring(1, index); }
        } else {
          // Get the content before the first space (or the while string if there is no space)
          const index = game.launchCommand.indexOf(' ');
          if (index >= 0) { str = game.launchCommand.substring(0, index); }
          else            { str = game.launchCommand; }
        }
        // Create a full path from the extracted path/url
        if (str !== undefined) {
          // Note: Because some strings could either be a path or URL ("localflash/game.swf" for example), this will assume that
          //       all URLs start with a protocol ("http://"). This will probably make this function not work for some games.
          const url = toURL(str);
          if (url) { return path.join(ffpPath, htdocsPath, urlToFilePath(url)); }
          else     { return path.join(ffpPath, shockwavePath, str); }
        }
      } break;
      // Launch Command contains
      // Example: http://www.example.com/game.html example\game.dll
      case 'activex': {
        // Extract everything before the first space
        let str: string | undefined = undefined;
        const index = game.launchCommand.lastIndexOf(' ');
        if (index >= 0) { str = game.launchCommand.substring(0, index); }
        else            { str = game.launchCommand; }
        // Create a full path from the extracted url
        const url = toForcedURL(str);
        if (url) { return path.join(ffpPath, htdocsPath, urlToFilePath(url)); }
      } break;
      // Launch Commands that only contain a URL
      // Example: http://example.com/games/cool_game.html
      case '3dvia player':
      case 'flash':
      case 'html5':
      case 'popcap plugin':
      case 'silverlight':
      default:
        return GameLauncher.getPathOfHtdocsUrl(game.launchCommand, ffpPath);
    }
  }

  /**
   * Get the path of the "htdocs" folder.
   * @param flashpointPath Path of the Flashpoint folder (if undefined, the current flashpoint path is used).
   */
  public static getHtdocsPath(flashpointPath?: string): string {
    if (flashpointPath === undefined) {
      flashpointPath = window.External.config.fullFlashpointPath;
    }
    return path.join(flashpointPath, GameLauncher.htdocsPath);
  }

  /**
   * Convert a url to a path of the file in the htdocs folder.
   * @param url URL string or object.
   * @param flashpointPath Path of the Flashpoint folder (if undefined, the current flashpoint path is used).
   */
  public static getPathOfHtdocsUrl(url: string | URL, flashpointPath?: string): string | undefined {
    const urlObj = (typeof url === 'string') ? toForcedURL(url) : url;
    if (urlObj) { return path.join(GameLauncher.getHtdocsPath(flashpointPath), urlToFilePath(urlObj)); }
  }

  public static async launchAdditionalApplication(addApp: IAdditionalApplicationInfo, native: boolean, waitForExit: boolean = false): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      switch (addApp.applicationPath) {
        case ':message:':
          remote.dialog.showMessageBoxSync({
            type: 'info',
            title: 'About This Game',
            message: addApp.launchCommand,
            buttons: ['Ok'],
          });
          break;
        case ':extras:':
          const folderPath = fixSlashes(relativeToFlashpoint(path.posix.join('Extras', addApp.launchCommand)));
          remote.shell.openExternal(folderPath, { activate: true })
          .catch(error => {
            if (error) {
              remote.dialog.showMessageBoxSync({
                type: 'error',
                title: 'Failed to Open Extras',
                message: `${error.toString()}\n`+
                        `Path: ${folderPath}`,
                buttons: ['Ok'],
              });
            }
          });
          break;
        default:
          const appArgs: string = addApp.launchCommand;
          const appPath: string = fixSlashes(relativeToFlashpoint(GameLauncher.getApplicationPath(addApp.applicationPath, native)));
          const useWine: boolean = process.platform != 'win32' && appPath.endsWith('.exe');
          const proc = GameLauncher.launch(
            GameLauncher.createCommand(appPath, appArgs, useWine),
            { env: GameLauncher.getEnvironment(useWine) }
          );
          log(`Launch Add-App "${addApp.name}" (PID: ${proc.pid}) [ path: "${addApp.applicationPath}", arg: "${addApp.launchCommand}" ]`);
          if (waitForExit) {
            proc.on('exit', () => { resolve(); });
            proc.on('error', (error) => { reject(error); });
          } else {
            resolve();
          }
          break;
      }
    });
  }

  /**
   * Launch a game
   * @param game Game to launch
   * @param addApps Additional applications to launch first
   * @param lang String to use for Wine warning. Static functions don't have a context to use.
   */
  public static launchGame(game: IGameInfo, lang: LangContainer['dialog'], addApps?: IAdditionalApplicationInfo[]): void {
    // Abort if placeholder (placeholders are not "actual" games)
    if (game.placeholder) { return; }
    const native = this.isPlatformNativeLocked(game.platform);
    // Run all provided additional applications with "AutoRunBefore" enabled
    addApps && addApps.forEach((addApp) => {
      if (addApp.autoRunBefore) {
        GameLauncher.launchAdditionalApplication(addApp, native, addApp.waitForExit);
      }
    });
    // Launch game
    const gameArgs: string = getLaunchCommand(game);
    const gamePath: string = fixSlashes(relativeToFlashpoint(GameLauncher.getApplicationPath(game.applicationPath, native)));
    // Force Wine usage if application path resolves to an .exe file (and not on Windows)
    const useWine: boolean = process.platform != 'win32' && gamePath.endsWith('.exe');
    // Warn when Wine isn't on the PATH, but is going to be used
    if (useWine) {
      which('wine', (err) => {
        if (err) {
          log('Warning : Wine is required but was not found. Is it installed?' +
              'Installation instructions may be found on your distro\'s website, or through the Flashpoint Wiki');
          const response = remote.dialog.showMessageBoxSync({
            type: 'error',
            title: lang.programNotFound,
            message: lang.wineNotFound,
            buttons: ['Ok', 'Open Wiki'],
          });
          // Open wiki in default browser (Some Linux distro's might no support xdg-open, but any sane distro will, best bet)
          if (response === 1) { exec('xdg-open https://bluemaxima.org/flashpoint/datahub/Linux_Support#Wine'); }
        }
      });
    }
    const command: string = GameLauncher.createCommand(gamePath, gameArgs, useWine);
    const proc = GameLauncher.launch(command, { env: GameLauncher.getEnvironment(useWine) });
    log(`Launch Game "${game.title}" (PID: ${proc.pid}) [\n`+
        `    applicationPath: "${game.applicationPath}",\n`+
        `    gamePath:        "${gamePath}",\n` +
        `    launchCommand:   "${game.launchCommand}",\n`+
        `    command:         "${command}" ]`);
    // Show popups for Unity games
    // (This is written specifically for the "startUnity.bat" batch file)
    if (game.platform === 'Unity' && proc.stdout) {
      let textBuffer: string = ''; // (Buffer of text, if its multi-line)
      proc.stdout.on('data', function(text: string): void {
        // Add text to buffer
        textBuffer += text;
        // Check for exact messages and show the appropriate popup
        for (let response of unityOutputResponses) {
          if (textBuffer.endsWith(response.text)) {
            response.func(proc);
            textBuffer = '';
            break;
          }
        }
      });
    }
  }

  /**
   * Returns either a Windows or Native path (if available and requested)
   * @param path Windows/XML application path
   * @param native Prefer native execs
   */
  private static getApplicationPath(path: string, native: boolean): string {
    const platform = process.platform;

    // Bat files won't work on Wine, force a .sh file on non-Windows platforms instead. Sh File may not exist.
    if (platform != 'win32' && path.endsWith('.bat')) {
      return path.substr(0, path.length - 4) + '.sh';
    }

    // Skip mapping if on Windows or Native application was not requested
    if (platform != 'win32' && native) {
      for (let i = 0; i < this.execMappings.length; i++) {
        const mapping = this.execMappings[i];
        if (mapping.win32 === path) {
          switch (platform) {
            case 'linux':
              return mapping.linux || mapping.win32;
            case 'darwin':
              return mapping.darwin || mapping.win32;
            default:
              return path;
          }
        }
      }
    }

    // No Native exec found, return Windows/XML application path
    return path;
  }

  /**
   * Get an object containing the environment variables to use for the game / additional application.
   * @param useWine If the application is launched using Wine.
   */
  private static getEnvironment(useWine: boolean): NodeJS.ProcessEnv {
    // When using Linux, use the proxy created in BackgroundServices.ts
    // This is only needed on Linux because the proxy is installed on system
    // level entire system when using Windows.
    return {
      // Add proxy env vars if it's running on linux
      ...((process.platform === 'linux') ? { http_proxy: 'http://localhost:22500/' } : null),
      // Add Wine related env vars if it's running through Wine
      ...(useWine ? {
        WINEPREFIX: path.join(window.External.config.fullFlashpointPath, 'FPSoftware/wineprefix'),
        // WINEARCH: 'win32',
        WINEDEBUG: '-all',
      } : null),
      // Copy this processes environment variables
      ...process.env,
    };
  }

  private static createCommand(filename: string, args: string, useWine: boolean): string {
    // Escape filename and args
    let escFilename: string = filename;
    let escArgs: string = args;
    // Use wine for any exe files (unless on Windows)
    if (useWine) {
      escFilename = 'wine';
      escArgs = `start /unix "${filename}" ${escapeLinuxArgs(args)}`;
    } else {
      switch (window.External.platform) {
        case 'win32':
          escFilename = filename;
          escArgs = escapeWin(args);
          break;
        case 'darwin':
        case 'linux':
          escFilename = filename;
          escArgs = escapeLinuxArgs(args);
          break;
      }
    }
    // Return
    return `"${escFilename}" ${escArgs}`;
  }

  private static launch(command: string, opts: ExecOptions): ChildProcess {
    // Run
    const proc = exec(command, opts);
    // Log for debugging purposes
    // (might be a bad idea to fill the console with junk?)
    const logStuff = (event: string, args: any[]): void => {
      log(`${event} (PID: ${padStart(proc.pid, 5)}) ${stringifyArray(args, stringifyArrayOpts)}`);
    };
    doStuffs(proc, [/* 'close', */ 'disconnect', 'error', 'exit', 'message'], logStuff);
    if (proc.stdout) { proc.stdout.on('data', (data) => { logStuff('stdout', [data.toString('utf8')]); }); }
    if (proc.stderr) { proc.stderr.on('data', (data) => { logStuff('stderr', [data.toString('utf8')]); }); }
    // Return process
    return proc;
  }
}

/**
 * Convert a URL to a path, where the hostname is the first folder,
 * and the pathname the folders afterwards.
 * @param url URL to convert.
 * @returns The converted path.
 */
export function urlToFilePath(url: URL): string {
  return decodeURIComponent(path.join(url.hostname, url.pathname));
}

/**
 * Create a URL object from a string.
 * @param str URL string.
 * @returns A URL object of the string, or undefined if it failed to create the object.
 */
function toURL(str: string): URL | undefined {
  try { return new URL(str); }
  catch { return undefined; }
}

/**
 * Create a URL object from a string.
 * First try creating it normally, if that fails try again with the 'http' protocol string at the start of the string.
 * @param str URL string.
 * @returns A URL object of the string, or undefined if it failed to create the object.
 */
function toForcedURL(str: string): URL | undefined {
  return toURL(str) || toURL('http://'+str);
}

const stringifyArrayOpts = {
  trimStrings: true,
};

function relativeToFlashpoint(filePath: string): string {
  return path.posix.join(window.External.config.fullFlashpointPath, filePath);
}

function doStuffs(emitter: EventEmitter, events: string[], callback: (event: string, args: any[]) => void): void {
  for (let i = 0; i < events.length; i++) {
    const e: string = events[i];
    emitter.on(e, (...args: any[]) => {
      callback(e, args);
    });
  }
}

function log(str: string): void {}

/**
 * Escape a string that will be used in a Windows shell (command line)
 * ( According to this: http://www.robvanderwoude.com/escapechars.php )
 */
function escapeWin(str: string): string {
  return (
    splitQuotes(str)
    .reduce((acc, val, i) => acc + ((i % 2 === 0)
      ? val.replace(/[\^&<>|]/g, '^$&')
      : `"${val}"`
    ), '')
  );
}

/**
 * Split a string to separate the characters wrapped in quotes from all other.
 * Example: '-a -b="123" "example.com"' => ['-a -b=', '123', ' ', 'example.com']
 * @param str String to split.
 * @returns Split of the argument string.
 *          Items with odd indices are wrapped in quotes.
 *          Items with even indices are NOT wrapped in quotes.
 */
function splitQuotes(str: string): string[] {
  // Search for all pairs of quotes and split the string accordingly
  const splits: string[] = [];
  let start = 0;
  while (true) {
    const begin = str.indexOf('"', start);
    if (begin >= 0) {
      const end = str.indexOf('"', begin + 1);
      if (end >= 0) {
        splits.push(str.substring(start, begin));
        splits.push(str.substring(begin + 1, end));
        start = end + 1;
      } else { break; }
    } else { break; }
  }
  // Push remaining characters
  if (start < str.length) {
    splits.push(str.substring(start, str.length));
  }
  return splits;
}

/**
 * Escape arguments that will be used in a Linux shell (command line)
 * ( According to this: https://stackoverflow.com/questions/15783701/which-characters-need-to-be-escaped-when-using-bash )
 */
function escapeLinuxArgs(str: string): string {
  return (
    splitQuotes(str)
    .reduce((acc, val, i) => acc + ((i % 2 === 0)
      ? val.replace(/[~`#$&*()\\|[\]{};<>?!]/g, '\\$&')
      : '"' + val.replace(/[$!\\]/g, '\\$&') + '"'
    ), '')
  );
}

const unityOutputResponses = [
  {
    text: 'Failed to set registry keys!\r\n'+
          'Retry? (Y/n): ',
    func(proc: ChildProcess) {
      remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Start Unity - Registry Key Warning',
        message: 'Failed to set registry keys!\n'+
                 'Retry?',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (!proc.stdin) { throw new Error('Failed to signal to Unity starter. Can not access its "standard in".'); }
        if (response === 0) { proc.stdin.write('Y'); }
        else                { proc.stdin.write('n'); }
      });
    }
  }, {
    text: 'Invalid parameters!\r\n'+
          'Correct usage: startUnity [2.x|5.x] URL\r\n'+
          'If you need to undo registry changes made by this script, run unityRestoreRegistry.bat. \r\n'+
          'Press any key to continue . . . ',
    func(proc: ChildProcess) {
      remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Start Unity - Invalid Parameters',
        message: 'Invalid parameters!\n'+
                 'Correct usage: startUnity [2.x|5.x] URL\n'+
                 'If you need to undo registry changes made by this script, run unityRestoreRegistry.bat.',
        buttons: ['Ok'],
        defaultId: 0,
        cancelId: 0,
      });
    }
  }, {
    text: 'You must close the Basilisk browser to continue.\r\n'+
          'If you have already closed Basilisk, please wait a moment...\r\n',
    func(proc: ChildProcess) {
      remote.dialog.showMessageBox({
        type: 'info',
        title: 'Start Unity - Browser Already Open',
        message: 'You must close the Basilisk browser to continue.\n'+
                 'If you have already closed Basilisk, please wait a moment...',
        buttons: ['Ok', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 1) { proc.kill(); }
      });
    }
  }
];

/** Returns a correctly formed Launch Command for a game (Important for cross-platform string forming)
 * E.G Adobe Flash joins parameters on Windows, but not on Linux
 */
function getLaunchCommand(game: IGameInfo) {
  if (game.platform.toLowerCase() === 'flash') {
    // Special checks for Flash
    let match = game.launchCommand.match(/[^\s"']+|"([^"]*)"|'([^']*)'/);
    if (match && !match[1]) {
      // Extracted first string from launch command via regex, was outside quotes
      console.log(match);
      // Match 1 - Inside quotes, Match 0 - No Quotes Found
      if (match[0].length != game.launchCommand.length) {
        // Unquoted launch command with spaces, check for a protocol at the start
        let protocol = match[0].match(/(.+):\/\//);
        if (protocol) {
          console.log('Improper');
          // Protocol found, must be an unquoted url!
          return `"${game.launchCommand}"`;
        }
      }
    }
  }
  // No launch command found, return it as is
  return game.launchCommand;
}