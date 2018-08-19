# Electron Library

## Setup
Run ``npm install`` then ``npm run build``.

## Debugging
Open two terminals and run ``npm run watch`` in one of them and ``npm run build`` in the other.

Note: The first time the app is run it will create a config file (``config.json``), open it and set the ``flashpointPath`` to the root of a FlashPoint folder.

## Release
1. Delete the ``build`` and ``dist`` folders.
2. Run ``npm run release``.

The release can then be found in the ``dist`` folder.
