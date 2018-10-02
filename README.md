# Flashpoint Launcher

## Setup
1. Download the project (and extract it, if it was downloaded as an archive).
2. Open a command prompt and navigate it to the projects root folder.
3. Run ``npm install``

## Development
1. Open a command prompt and run ``npm run build`` then ``npm run watch``
2. Open another command prompt and wait for ``build`` to complete, then run ``npm run start``

The ``build`` command compiles the source code, and copies the resources, to the ``build`` folder.

The ``watch`` command runs a piece of software that detects changes made to the source code and resources, and re-builds the application whenever a change is detected. Highly recommended to leave running while you are developing (and preferably within sight, since it shows compilation errors - also because it crashes sometimes).

The ``start`` command launches the current build of the application. This will <u>not</u> automatically update when you change the source code or resources, you have to restart it manually.

## Release
Run ``npm run release:PLATFORM`` (where ``PLATFORM`` is either ``win32`` or ``linux``)

The release builds can be found in the ``dist`` folder (the folder is created when making a release build).

## Troubleshooting

### "Not allowed to load local resource" Error
If this error appears in the electron applications console, it is probably because the file it is looking for does not exist. To solve this, run ``npm run build``

Example: ``Not allowed to load local resource: file:///<ProjectPath>/build/renderer/index.html``
