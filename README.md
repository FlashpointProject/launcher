# Flashpoint Launcher
The launcher for Flashpoint Archive (the community web preservation project).

![Screenshot](https://user-images.githubusercontent.com/10117720/55276674-a24e8c80-52f6-11e9-8b59-4fb396c36026.png)

### Status

[![Crowdin](https://badges.crowdin.net/flashpoint-launcher/localized.svg)](https://crowdin.com/project/flashpoint-launcher)

### Links
* [Documentation](https://flashpointproject.github.io/launcher) - Documentation for Configuation, Development and Extensions information of the Flashpoint Launcher.
* [Flashpoint Archive](https://flashpointarchive.org) - Download Flashpoint here (the launcher is bundled with it)
* [Donate](https://opencollective.com/flashpointarchive) - Funds go towards the Flashpoint Archive to sustain archival efforts (server costs), not to individual contributors.

## About
The Flashpoint Launcher (FPL) is a desktop application made for browsing, storing and launching other applications (games, animations, web apps etc.). It is specifically made for Flashpoint Archive, a community project with the goal of furthering archival and accessibility efforts for games, animations and other digital interactive experiences on the web.

## Building from source

### External Dependencies

#### Dependencies
* [Git](https://git-scm.com/downloads) (for downloading and updating the source code and sub-modules)
* [Node & NPM](https://nodejs.org/en/download/) (for building and running the source code)

#### Linux Dependencies
* `libgtk-3-0`
* `libnss3`

Follow Development Setup, using ``master`` branch for a stable release or ``develop`` for the latest features. After setup is complete, run ``npm run release`` to generate release builds in ``/dist``.

Install by running ``sudo apt install libgtk-3-0 libnss3``

### Development Setup

1. Clone the repository with ``git clone --branch develop --recurse-submodules https://github.com/FlashpointProject/launcher.git launcher`` (where ``launcher`` is the path of the directory you want to be the root of the repository).

2. ``npm install``

3. You have 2 options for development, Electron or Browser:

Browser:
`npm run watch:web` - Builds extensions, builds and watches backend process and static files
`npm run start:web` - Builds and watches renderer, automatically opens in browser
Node debugging for the backend is available on port 9229.
There is also a vscode task (`Watch Full Stack (Web)`) and debug configuration (`Debug Backend (Web)`) available to use

Electron:
`npm run watch` - Builds and watches extensions, backend process and static files
`npm run start` - Starts Electron process

5. **Optional** - It is highly recommended to set the launcher's "Flashpoint folder" after first running it. This is where the launcher will read and write most data to and from. You can set the "Flashpoint Path" in the "Config" tab in the launcher. Make sure the background of the text field is green (this means the path is valid) and don't forget to hit "Save and Restart"!

You can also manually set this in the `config.json` file created in the project after first run

Notes:

* React components use the React Compiler. If creating new components please make sure they are compiled, see this extension for a handy IDE hint in Vscode. Existing components are fine to be skipped. https://marketplace.visualstudio.com/items?itemName=blazejkustra.react-compiler-marker
* You will need to run ``npm install`` whenever a dependency is added or upgraded in ``package.json``.
* Best practice is to use the most recent Flashpoint Infinity installation folder as your Flashpoint Path
* It is recommended to have a separate "Flashpoint Path" for launcher development than normal usage.

## Package Scripts
Short descriptions of what the scripts in ``package.json`` do:

* ``build`` - *(Electron)* Build the launcher
* ``watch`` - *(Electron) Builds and watches extensions, backend process and static files
* ``watch:web` - *(Browser)* Builds extensions, builds and watches backend process and static files
* ``nexusBuild`` - Builds the 32 bit Windows version of the Launcher
* ``nexusPack`` - Packages the build as expected for full release
* ``start`` - *(Electron)* Run the Electron version of the launcher
* ``start:web`` - *(Browser)* Builds and watches the Browser version of the launcher
* ``test`` - Run the test suite
* ``lint`` - Run the linter

``pack`` / ``snapshot`` / ``release`` will by default pack for the OS and architecture of the machine that runs it.

To pack for a specific OS / architecture use the handy package scripts (such as ``pack:linux`` or ``release:win32``) or set the environment variables ``PACK_PLATFORM`` / ``PACK_ARCH``.

## Troubleshooting

### "Not allowed to load local resource" Error
If this error appears in the electron applications console, it is probably because the file it is looking for does not exist. To solve this, run ``npm run build``

Example: ``Not allowed to load local resource: file:///<ProjectPath>/build/renderer/index.html``
