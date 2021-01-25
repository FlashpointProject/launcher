## Meta Edits

The launcher lets you export parts of a game's meta as a "meta edit". These can later be imported by anyone to apply the exported changes to the same game in their local database.

This enables anyone who spots an error in a game's meta to: change it locally, export the change and send it to us. Thus fixing the error for everyone in a later release!

### Exporting

To open the meta exporter:
* Right-click the game you want to export in the game list/grid
* Select the "Export Meta Edit" option

Using the meta exporter:
* Select the properties you want to include in the meta export
* Click the "Export" button

After a clicking the "Export" button, the launcher will create a meta edit file in ``Data/MetaEdits`` folder named after the games ID. If a file already exists with the same name it will be silently overwritten.

### Importing

There is only one way to import meta edits at the moment, and this is to import all meta edits in the ``Data/MetaEdits`` folder.

To import *all* meta edits:
* Go the the Developer tab
    - If the tab is not displayed, go to the "Config" tab and enable "Show Developer Tab"
* Click the "Import Meta Edits" button
* If there are any conflicts in the meta edits you will be promoted to select which value to apply

**Note:** This does *NOT* delete the meta edit files. The files have to be moved / deleted manually.

### Import Log

When the import is complete (or aborted) a log will be displayed, detailing how it went.

The log is divided into 4 sections:
- *Applied changes*
- *Discarded changes*
- *Games not found*
- *Errors*

If the import was aborted then the following message will be printed near the top of the log: ``IMPORT ABORTED!``

#### Applied changes

Lists all changes in the meta edits that were applied to the games.

Only games listed here will have their ``Date Modified`` value updated.

```
Applied changes (X changes in Y games):

  <Game title> (<Game ID>)
    <Property name>:
      from: <Value before edit>
      to:   <New value>
    ...

  ...
```

#### Discarded changes

Lists all changes in the meta edits that were discarded and *not* applied to the games.

Reasons for discarding includes:
* The new value is identical to the current
* The value was manually rejected during a collision

```
Discarded changes (X changes in Y games):

  <Game title> (<Game ID>)
    <Property name>: <Discarded value>
    ...

  ...
```

#### Games not found

Lists the IDs of all games that meta edits tried to change but were not found.

```
Games not found (X):

  <Game ID>
    Files:
      <Filename of a meta edit with one or more changes for this game>
      ...

  ...
```

#### Errors

Lists all errors that occurred during the import.

Errors are only expected to happen if the launcher fails to load the meta edit files. All other errors are launcher bugs and should be reported!

Note: ``Stack`` is optional and might not show up on all errors.

```
Errors (X):

  <Error name>: #<Error index>
    Message: <Error message>
    Stack: <Error stack>

  ...
```

### Format

A meta edit file can store edits for any number of games.

The file contains the following data:
* An array of metas (one per game):
    - ID of the game (used for identifying the game)
    - Names and values of the exported properties
* Version of the launcher that exported it

Pseudo-JSON:
```
{
  "metas": [
    {
      "id": uuid,
      Exported properties goes here...
    },
    More meta edits goes here...
  ],
  "launcherVersion": semver
}
```

Example:
```
{
  "meta": [
    {
      "id": "08143aa7-f3ae-45b0-a1d4-afa4ac44c845",
      "title": "Ayyylien Hominid",
      "source": "Oldgrounds.com",
      "extreme": true
    }
  ],
  "launcherVersion": "9.0.0"
}
```
