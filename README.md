# Flashpoint Launcher

## Setup
1. Download the project (and extract it, if it was downloaded as an archive).
2. Open a command prompt and navigate it to the projects root folder.
3. Run ``npm install``

## Development
1. Open a command prompt and run ``npm run watch`` and wait for it to finish building
2. Open another command prompt and wait for ``build`` to complete, then run ``npm run start``

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
