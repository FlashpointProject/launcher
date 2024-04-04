# Keyboard Shortcuts

## Hardcoded

`CTRL + SHIFT + R` - Restart the Electron window, without restarting the backend.

## Configurable

Keyboard shortcuts are configurable in `preferences.json`.

Actions are defined as `section - action` (e.g. `curate - prev`)

All shortcuts are defined in an array and can accept multiple binds. `ctrl` and `cmd` should both be used to support both Mac and Windows based keyboards.

```json
"shortcuts": {
  "curate": {
    "prev": [
      "ctrl+arrowup",
      "cmd+arrowup"
    ]
  }
}
```

### List of Actions

- `curate` - *Active on the Curate Page*
  - `prev` - *Show previous curation*
  - `next` - *Show next curation*
  - `load` - *Open dialog to load a curation archive*
  - `newCur` - *Create a new curation*
  - `deleteCurs` - *Delete all selected curations*
  - `exportCurs` - *Export all selected curations*
  - `exportDataPacks` - *Export data packs for all selected curations*
  - `importCurs` - *Imports all selected curations*
  - `refresh` - *Refreshes the content tree view for the curation*
  - `run` - *Runs the curation*
  - `runMad4fp` - *Runs the curation with a MAD4FP enabled server, if available*

### Default Configuration

```json
"shortcuts": {
  "curate": {
    "prev": [
      "ctrl+arrowup",
      "cmd+arrowup"
    ],
    "next": [
      "ctrl+arrowdown",
      "cmd+arrowdown"
    ],
    "load": [
      "ctrl+o",
      "cmd+o"
    ],
    "newCur": [
      "ctrl+n",
      "cmd+n"
    ],
    "deleteCurs": [
      "ctrl+delete",
      "cmd+delete"
    ],
    "exportCurs": [
      "ctrl+s",
      "cmd+s"
    ],
    "exportDataPacks": [
      "ctrl+shift+s",
      "cmd+shift+s"
    ],
    "importCurs": [
      "ctrl+i",
      "cmd+i"
    ],
    "refresh": [
      "ctrl+r",
      "cmd+r"
    ],
    "run": [
      "ctrl+t",
      "cmd+t"
    ],
    "runMad4fp": [
      "ctrl+shift+t",
      "cmd+shift+t"
    ]
  }
}
```
