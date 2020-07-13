# Extensions

## Installing

Extensions should be unpacked to `/Data/Extensions` where an example path would be `/Data/Extensions/MyFirstExtension`. 

Developer Note - Try to keep extension folder names unique as to not risk collision with other extensions.

## Running

Extensions are automatically loaded on Launcher startup with no ability to disable them. If you want to reload an extension you must currently restart the Launcher.

## Creating

All themes require a `package.json` manifest at the root of their extension path. You'll recognize this if you've written Node JS modules before. An example is below, with explanations beneath.

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

Your entry point must be declared in `package.json` like it would in a Node JS module with `main`. If you're using TypeScript make sure this points to the build output, more details below.

```json
{
  "main": "./path/to/extension.js"
}
```

The example below logs `Hello World!` to the Logs page, check it after launch to see its results. TypeScript specific instructions are below it.

JavaScript file example
```javascript
import * as flashpoint from 'flashpoint';

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
import * as flashpoint from 'flashpoint';

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
    "themes: [
      {
        "id": "my-first-theme",
        "path": "./themes/MyTheme"
      }
    ]
  }
}
```

The theme path should be the folder in which `theme.css` resides. All files the theme uses should be kept inside this folder. Any attempts to access files outside it will cause an illegal file request warning instead.

### Logo Sets

You can find information specific to making logo sets in the Logo Sets documentation, this section will only cover including them in an extension.

Logo Sets are declared as part of the extensions manifest, `package.json`. Multiple logo sets can be declared, but they should have unique IDs. Be careful not to make them too generic as to collide with other extensions.

```json
{
  "contributes": {
    "logoSets: [
      {
        "id": "my-first-theme",
        "name": "My Logo Set",
        "path": "./logoSets/MyLogoSet"
      }
    ]
  }
}
```

Unlike Themes, the name shown in the Config page is declared here as `name` instead.

Logos for platforms will then be read relative to the folder, e.g `./logoSets/MyLogoSet/Flash.png`
