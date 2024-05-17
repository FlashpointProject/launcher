# Database API

## Overview

The Database API is only available from the backend. The frontend must make a request (see [Front / Back Communication](communication)) to interact with the database.

You can use the database through the `fpDatabase` object which is exported from `src/back/index.ts`. It must have been set up inside `initialize()` first but it's unlikely you'll ever access it before then.

All the logic for the database API is contained with the `flashpoint-archive` Rust crate, and the `@fparchive/flashpoint-archive` node binding. For more details on how to modify this database API during development please see [Database API Development](setup#database-api-development)

Most methods are fairly straight forward

```ts
// Get metadata for a game
const game = await fpDatabase.findGame(gameId);

// Get a list of tag categories
const cats = await fpDatabase.findTagCategories();

// Adding a new tag to a game
game.tags.push("cool tag");
await fpDatabase.saveGame(game);
```