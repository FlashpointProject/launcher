# Flashpoint Launcher
The launcher for BlueMaxima's Flashpoint (the web preservation project).

![Screenshot](https://user-images.githubusercontent.com/10117720/55276674-a24e8c80-52f6-11e9-8b59-4fb396c36026.png)

### Status

[![Flashpoint Launcher](https://github.com/FlashpointProject/launcher/workflows/Build%20and%20Release%20Status/badge.svg)](https://github.com/FlashpointProject/launcher)

[![Flashpoint Launcher](https://github.com/FlashpointProject/launcher/workflows/Build%20Status/badge.svg)](https://github.com/FlashpointProject/launcher)

[![Coverage Status](https://coveralls.io/repos/github/FlashpointProject/launcher/badge.svg?branch=master)](https://coveralls.io/github/FlashpointProject/launcher?branch=master)

[![Crowdin](https://badges.crowdin.net/flashpoint-launcher/localized.svg)](https://crowdin.com/project/flashpoint-launcher)

### Links
* [BlueMaxima's Flashpoint](http://bluemaxima.org/flashpoint) - Download Flashpoint here (the launcher is bundled with it)
* [Trello](https://trello.com/b/Tu9E5GLk/launcher) - Upcoming features, known bugs etc.
* [Launcher Releases](https://github.com/FlashpointProject/launcher/releases) - Download release builds of the launcher here

## About
The Flashpoint Launcher (FPL) is a desktop application made for browsing, storing and launching other applications (games, animations, web apps etc.). It is specifically made for BlueMaxima's Flashpoint, which is a web preservation project.

## Linux Dependencies
* `libgtk-3-0`
* `libnss3`

Install by running ``sudo apt install libgtk-3-0 libnss3``

## Development Setup
Recommended setup for development:
1. Clone the repository with ``git clone --recurse-submodules https://github.com/FlashpointProject/launcher.git launcher``
2. At the root of the repository install all dependencies with ``npm install``. (Linux users see above for additional dependencies)
3. At the root of the repository run ``npm run build``. If you want changes to source and static files to continuously build then use ``npm run watch`` instead.
4. Open a second command prompt and run ``npm run start`` to start the launcher.
5. **Optional** If you have an existing Bluemaxima's Flashpoint package and want to use its data during development, go to the Config tab in the launcher and select the same folder then press Save and Restart at the bottom. (Data, Server, FPSoftware at its root)

## Package Scripts
* ``build`` - Build the launcher (build main & renderer and copy static files to ``./build/``)
* ``watch`` - Build the launcher and incrementally rebuild it when the source or static files change
* ``pack`` - Pack the latest build (and put the packaged file with the executable electron app in ``./dist/``)
* ``release`` - Build then pack the launcher (same as running ``build`` then ``pack``)
* ``start`` - Run the latest build of the launcher

``pack`` and ``release`` will by default pack for the OS and architecture of the machine that runs it.

To pack for a specific OS / architecture use the handy package scripts (such as ``pack:linux`` or ``release:win32``) or set the environment variables ``PACK_PLATFORM`` / ``PACK_ARCH``.

## Troubleshooting

### "Not allowed to load local resource" Error
If this error appears in the electron applications console, it is probably because the file it is looking for does not exist. To solve this, run ``npm run build``

Example: ``Not allowed to load local resource: file:///<ProjectPath>/build/renderer/index.html``
