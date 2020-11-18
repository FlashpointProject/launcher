# Extensions

## Installing

Extensions should be unpacked to `/Data/Extensions` where an example path would be `/Data/Extensions/MyFirstExtension`. 

Developer Note: Try to keep extension folder names unique as to not risk collision with other extensions.

## Running

Extensions are automatically loaded on Launcher startup with no ability to disable them. If you want to reload an extension you must currently restart the Launcher.

## Creating

All extensions require a `package.json` manifest at the root of their extension path. You'll recognize this if you've written Node JS modules before. An example is below, with explanations beneath.

An extension should be packed as to be easily installable as described in the `Installing` section above. In the future the Launcher will be able to install them itself.

```json
{
  "name": "my-first-extension",
  "displayName": "My First Extension",
  "author": "your-name",
  "version": "0.0.1",
  "launcherVersion": "9.0.0",
  "description": "Example of an Extension",
  "icon": "/path/to/icon",
  "contributes": {}
}
```

**name** - Name of the extension. Must have no spaces or special characters.

**displayName** - *(Optional)* - Name displayed to the user. Will use `name` if missing.

**author** - Name of the author. Must have no spaces or special characters.

**version** - Version of the extension.

**launcherVersion** - Minimum launcher version supported. Use a wildcard if not applicable.

**description** - *(Optional)* - Description of the extension displayed to the user.

**icon** - *(Optional)* - Icon to display to the user.

**contributes** - *(Optional)* - Used to declare contributions. Relevance is explained in other documentation when relevant.

### Code

Extensions may have TypeScript / JavaScript which will be dynamically loaded in to register various things with the API. Check the API documentation for specifics, this will cover it broadly.

Live documentation can be found here: https://flashpointproject.github.io/launcher_ApiDocs/

Your entry point must be declared in `package.json` like it would in a Node JS module with `main`. If you're using TypeScript make sure this points to the build output, more details below.

```json
{
  "main": "./path/to/extension.js"
}
```

The example below logs `Hello World!` to the Logs page, check it after launch to see its results. TypeScript specific instructions are below it.

JavaScript file example
```javascript
import * as flashpoint from 'flashpoint-launcher';

function activate(context) {
  flashpoint.log.info('Hello World!');
}

exports.activate = activate;
```

If you're using TypeScript then make sure that TypeScript is installed as a dev dependency with `npm install --save-dev typescript` as well. An example tsconfig.json is provided below to build from `./src` into `./dist` (E.G `./src/extension.ts` to `./dist/extension.js`)

You should also copy `/typings/flashpoint.d.ts` from the Launcher repository into your own `/typings` folder to allow TypeScript to find the API declarations.

Example tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist",
  },
  "exclude": [
    "./dist"
  ],
  "include": [
    "./typings",
    "./src"
  ]
}
```

A simple build script is below to include in `package.json` to run `npm run build` to rebuild your extension.

Build script
```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

TypeScript file example
```javascript
import * as flashpoint from 'flashpoint-launcher';

export function activate(context: flashpoint.ExtensionContext) {
  flashpoint.log.info('Hello World!');
}
```

### Themes

You can find information specific to making themes in the Themes documentation, this section will only cover including them in an extension.

Themes are declared as part of the extensions manifest, `package.json`. Multiple themes can be declared, but they should have unique IDs. Be careful not to make them too generic as to collide with other extensions.

```json
{
  "contributes": {
    "themes": [
      {
        "id": "my-first-theme",
        "path": "./themes/MyTheme",
        "logoSet": "my-first-logoset"
      }
    ]
  }
}
```

The theme path should be the folder in which `theme.css` resides. All files the theme uses should be kept inside this folder. Any attempts to access files outside it will cause an illegal file request warning instead.

Optionally, a logo set can be applied whenever the theme is. Set the `logoSet` parameter to the ID of a logo set. It is recommended you include the logo set in the same extension with the theme. See more about logo sets below.

### Logo Sets

You can find information specific to making logo sets in the Logo Sets documentation, this section will only cover including them in an extension.

Logo Sets are declared as part of the extensions manifest, `package.json`. Multiple logo sets can be declared, but they should have unique IDs. Be careful not to make them too generic as to collide with other extensions.

```json
{
  "contributes": {
    "logoSets": [
      {
        "id": "my-first-logoset",
        "name": "My Logo Set",
        "path": "./logoSets/MyLogoSet"
      }
    ]
  }
}
```

Unlike Themes, the name shown in the Config page is declared here as `name` instead.

Logos for platforms will then be read relative to the folder, e.g `./logoSets/MyLogoSet/Flash.png`


### Context Buttons

Extensions can provide context buttons to show when right-clicking Playlists or Games. The registered command is then run with either the Playlist or Game as an argument when clicked. See API documentation on ``commands.registerCommand` and for more details.

```json
{
  "contributes": {
    "contextButtons": [
      {
        "context": "game" / "playlist",
        "name": "Click Me",
        "command": "my-first-extension.do-something"
      }
    ]
  }
}
```

### Applications

Extensions can provide Applications for the launcher to use. Whenever one of the strings in `provides` is used the path, url or command is used to run the application instead of defaulting to a relative path to the Flashpoint folder.

Be sure to read past the example for more important information.

```json
{
  "applications": [
    {
      "provides": [
        ":my-application:"
      ],
      "name": "My Application",
      "path": "<extPath>/app.exe"
    }
  ]
}
```

In this example, any game run with the `:my-application:` application path will use `<extPath>/app.exe` in its place when launching, where `<extPath>` will be replaced with the path of the Extension on disk.

However, Applications can also provide `url` or `command` instead. The full details of all 3 including `path` are listed below.

`path` will launch the application with the launch command as its arguments. You must use the `<exePath>` or `<fpPath>` subtitutions to correctly reference the application.

`url` will launch that URL in Flashpoints Browser Mode (Electron). The launch command must be subtituted since it can not be given as an argument this way. See below for allowed subtitutions.

`command` will run a registered command that is given the launching Game as an argument and expects a valid response of either a string (`path`) or BrowserApplicationOpts (`url`) which will then be run accordingly. Subtitutions cannot be used on the returned values, although you may find their equiavelents in the API, with an exception of os, arch and cwd which you may use Node types for. (`@types/node`)

`url` and `path` string subtitutes:

- **\<exePath\>** - Path to the extension.
- **\<fpPath\>** - Path to the Flashpoint folder.
- **\<os\>** - See https://nodejs.org/api/process.html#process_process_platform
- **\<arch\>** - See https://nodejs.org/api/process.html#process_process_arch
- **\<exeDataURL>** - URL to the Extensions 'static' folder. Useful for Browser Mode.
- **\<launchCommand\>** - Launch Command of the application. Useful for Browser Mode, `path` applications will have it included as arguments already.
- **\<cwd\>** - Current working directory. This is not guaranteed to be anywhere relative to Flashpoint.exe nor the Flashpoint folder, do not use unless certain.
- **\<extConf:com.example.value\>** - Extension config value. Place the config id after the semi-colon.

### Configuration

```json
{
  "configuration": [
    {
      "title": "Test Extension",
      "properties": {
        "title": "Test Select",
        "type": "string",
        "enum": [
          "string1",
          "string2"
        ],
        "default": "string1",
        "description": "Example of an extension config prop",
      }
    }
  ]
}
```

**title** - Title of the Configuration section to display on the Config page.

**properties** - Array of various Configuration props to be editable under this section.

- **title** - Title of the configuration prop
- **description** - Description of the configuration prop
- **type** - Type of this configuration prop's value (string, boolean or object)
- **enum** - *(Optional)* - Array of enums to use when you want a Select config box instead of an Input config box.
- **default** - Default value of this configuration prop