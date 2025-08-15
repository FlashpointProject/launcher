# Goals

- Have a very deep level of visual and functional customization to the majority of the Launcher, particularlly the Browse pages
- Turn most of the existing systems into jigsaw pieces that can be fit together at request of the extension developer
- Provide easy to use ways to create customized components built like the existing set so extensions can choose to use them instead of reinventing the wheel
- Allow highly specific functionality for content which won't interfere with other content that is also browseable in launcher
- Create a basic yet flexible common Search API which extensions must adhere to, with ability to support any use case, for example:
  - Browsing a local database (Flashpoint Archive)
  - Browsing results taken from querying directories on disk (ROM file directories)
  - Browsing results from existing APIs, like Steam, Youtube etc

# Helper Functionality

Flashpoint Launcher will provide a few extras to make it easier to support new data:
- Running applications and background services can already be managed via the Services API
- Wrapper for defining a List View with custom headers
- Wrapper for defining a Grid View with a given Grid render function
  - Game List Item wrapper, length must match header lengths, can provide individual render funcs for each
  - Game Grid Item wrapper with a given id, title, logo and icon list
- Built-in handling of Software component downloads and hash verifying the files before installation
  - Software providers may have to handle verification and configuration themselves
- Simple Metadata Update API for providers which do not read metadata remotely and want to only have updates apply on request (Subject to change)
- React Components for common wrappers like:
  - Home Page boxes with custom internals
  - Editable sidebar fields which display and / or modify content metadata

# Game

Required fields:
- `id` string
- `title` string
- `runner` string (Decides which content runner to use)
- `logoPath` string (opt. Primary image)
- `screenshotPath` string (opt. Secondary image)
- `imageFileProvider` string (opt. Priority filter when choosing the file provider for Logos and Screenshots)

Optional fields:
- Arbitrary

Extensions can coerce the type to narrow down type safety if they are confident their field is unique.

# Content Runner

Handles starting and stopping of games, and associated services like daemons.
Register a unique handler to each `runner` value, Extensions can use code reuse if needed.

Can implement the Software check

# File Provider

Exposes Logos, Screenshots or other Custom prefix routes over the localhost file server.
For Logos and Screenshots, be fed a request, must write response itself, returns whether it handled the request.
Content will priority use the `fileProvider` field otherwise iterate over each until one returns true.

Custom routes will define a prefix which will exist under a unique name. Will handle all aspects of requests.

# Software Components

Extensions can register Software Components, these replace the old style Flashpoint Manager system.

Provides easy management of prerequisite software and updating of software outside of individual games. Primarily for content which will help run content.

Fields:
- `id`
- `name`
- `installed`
- `sizeOnDisk` (opt.)
- `downloaddSize` (opt.)
- `downloadHash` (opt.)
- Arbitrary fields

Flashpoint will likely use an optional 'provides' field or just check install state of components in its Content Runner.

# Search Provider

Search providers are given a query, and are expected to return results from an async function in a specific format with only a few required fields.
They are free to decide how to perform that search, and the level of detail to return in a search vs when requesting a single game.
Must fit query workflow via common API:
- Text change or Advanced filters change forces query to rebuild (`rebuildQuery`)
- Query building must consider both text and advanced filters at the same time
- Query changing will automatically wipe existing results
- Be able to return metadata for a specific game in full

Can choose which search capabilities to support, must support at least one
- Indexed Keyset Pagination (Current)
- All results at once
- Infinite scroll (Keyset Pagination)

Frontend side must provide it's own way of presenting the data

# Browse Page

Each search provider will have an individual tab within the view.
This makes sure the visuals remain tailored to the content the search provider has without requiring a high level of compatability between structures.
Can choose which providers will be queryed even when the tab isn't in view.
Current Tab -> Other Tabs in order, so results are faster on the first page.
Rendering of tables is handled by the frontend portion of the search provider.

The sidebar rendering function will be built by factory and cached based on the ID of the search provider.
When a new render function is created, extensions will be queried in their load order to add or remove components.
They can also register component overrides which are applied before theme component overrides.