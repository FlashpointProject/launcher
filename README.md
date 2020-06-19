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

## Building from source

### External Dependencies

#### Dependencies
* [Git](https://git-scm.com/downloads) (for downloading and updating the source code and sub-modules)
* [Node & NPM](https://nodejs.org/en/download/) (for building and running the source code)

#### Linux Dependencies
* `libgtk-3-0`
* `libnss3`

Install by running ``sudo apt install libgtk-3-0 libnss3``

### Development Setup

1. Clone the repository with ``git clone --recurse-submodules https://github.com/FlashpointProject/launcher.git launcher`` (where ``launcher`` is the path of the directory you want to be the root of the repository).

2. Navigate to the root of the repository and run ``npm install`` - this will download and install all the dependencies from npm (it may take a few minutes).

3. Run ``npm run build`` or ``npm run watch`` (at the root of the repository). This will compile the source code and such so the launcher can be executed. If ``watch`` is used, it will rebuild the launcher automatically when a source code or static file is changed.

4. Run ``npm run start`` (at the root of the repository) to start the launcher. It is recommended to do this in a second command prompt / terminal.

5. **Optional** - It is highly recommended to set the launcher's "Flashpoint folder". This is where the launcher will read and write most data to and from. You can set the "Flashpoint folder" path at the "Config" tab in the launcher. Make sure the background of the text field is green (this means the path is valid) and don't forget to hit "Save and Exit"!

Notes:

* You will need to run ``npm install`` whenever a dependency is added or upgraded in ``package.json``.
* The launcher is changing rapidly and does not always support older "Flashpoint folders". Sometimes it does not even support the most recent one.
* It is recommended to have a separate "Flashpoint folder" for launcher development than normal usage.

## Package Scripts
Short descriptions of what the scripts in ``package.json`` do:

* ``build`` - Build the launcher (build main & renderer and copy static files to ``./build/``)
* ``watch`` - Build the launcher and incrementally rebuild it when the source or static files change
* ``pack`` - Pack the latest build (and put the packaged file with the executable electron app in ``./dist/``)
* ``snapshot`` - Build then pack the launcher (same as running ``build`` then ``pack``)
* ``release`` - Build then pack the launcher in release mode (same as ``snapshot`` but with a release flag set)
* ``start`` - Run the latest build of the launcher
* ``test`` - Run the test suite (to find out if anything covered by the tests has been broken)
* ``lint`` - Run the linter

``pack`` and ``release`` will by default pack for the OS and architecture of the machine that runs it.

To pack for a specific OS / architecture use the handy package scripts (such as ``pack:linux`` or ``release:win32``) or set the environment variables ``PACK_PLATFORM`` / ``PACK_ARCH``.

## Troubleshooting

### "Not allowed to load local resource" Error
If this error appears in the electron applications console, it is probably because the file it is looking for does not exist. To solve this, run ``npm run build``

Example: ``Not allowed to load local resource: file:///<ProjectPath>/build/renderer/index.html``
