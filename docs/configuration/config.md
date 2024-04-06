# config.json

## Overview

The `config.json` file will be generated next to the Launcher executable and will have a few basic settings that can often be considered immutable by your project.

User or Data version specific options are found in [preferences.json](preferences) instead.

## Options

`flashpointPath` - Path to the root folder (where the `/Data` folder will be), can be relative or absolute. Same folder as the working directory when empty.

`useCustomTitlebar` - If set to true, it will allow the operating system to use its own titlebar instead of our own.

`startServer` - Whether the `server` will be automatically started and closed as defined in [services.json](services)

`backPortMin` / `backPortMax` - Port range the Launcher will iterate over to get a free port when opening the websocket for front / back communication

`imagesPortMin` / `imagesPortMax` - Port range the Launcher will iterate over to get a free port when opening the Fileserver to respond to image (and curate file) local web requests.

`logsBaseUrl` - The base URL of the Flashpoint Paste server. You're free to use ours by default or selfhost.

`updatesEnabled` - **UNUSED**

`gotdUrl` - The URL where a remote `gotd.json` is located and will be fetched on startup. If unavailable, the existing `/Data/gotd.json` file will be used.

`gotdShowAll` - When set to true, will stop hiding games that are chosen for a date later than Today.

`middlewareOverridePath` - Used by extensions when copying files to override those returned by the Flashpoint Game Server if used. Pretty Flashpoint Archive specific.

## Default Configuration

```json title="config.json"
{
  "flashpointPath": "",
  "useCustomTitlebar": false,
  "startServer": true,
  "backPortMin": 12001,
  "backPortMax": 12100,
  "imagesPortMin": 12101,
  "imagesPortMax": 12200,
  "logsBaseUrl": "https://logs.unstable.life/",
  "updatesEnabled": true,
  "gotdUrl": "https://download.unstable.life/gotd.json",
  "gotdShowAll": false,
  "middlewareOverridePath": "Legacy/middleware_overrides/"
}