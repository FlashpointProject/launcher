# Setup

## Overview

Flashpoint Launcher is built from a few components:
- Backend Nodejs process
- Database API written in Rust
- Frontend Electron renderer w/ ReactJS framework

Follow the [Required Setup](#required-setup) first, then follow on to [Database API Development](#database-api-development) only if you need to make changes to Database API.

If you've already got a cloned repo that builds and runs, please see [Git Workflow](gitworkflow) before starting to make commits.

## Required Setup

To work on the launcher, the minimum you'll need is:
- [NodeJS 18 or higher](https://nodejs.org/)

Clone the Launcher repository and its submodules:

```
git clone https://github.com/FlashpointProject/launcher.git launcher --recurse-submodules
```

Inside the new `launcher` folder, install the dependencies:

**Note:** The project is written to be used with npm, if you want to use other package management tools your milage may vary.

```bash
npm install
```

Make sure it builds and runs

```bash
npm run build
```

```bash
npm run start
```

### Watching

During development, you can run `watch` to automatically recompile any saved changes. Any backend changes will require the software to restart, but frontend only changes can use `CTRL + SHIFT + R` to restart the window.

```bash
npm run watch
```

### Debugging

Flashpoint Launcher includes VSCode launch configurations for debugging already, just use the debug tab in the IDE.

If you want to use debugging in other IDEs then use the NodeJS debugging tools for the backend, and the Chrome devtools (automatically enabled during development) for the frontend. You can enable the Chrome debug port by passing `--remote-debugging-port=9223` to the electron process.

### Next Steps

Once you see the window working, you can carry on to Database API Development if you want to make modifications to the Database API, otherwise carry on to [Git Workflow](gitworkflow) to learn how to structure your contributions.

## Database API Development

If you haven't already, set up your project through [Required Setup](#required-setup).

The Database API is written in Rust for the `flashpoint-archive` Rust crate.

To work on the Database API, the minimum you'll need is:
- [Rust 1.76 or higher](https://www.rust-lang.org/)

Clone the Rust project to a new folder, outside the launcher folder:
```bash
git clone https://github.com/FlashpointProject/FPA-Rust.git fpa-rust --recurse-submodules
```

Inside the new `fpa-rust` folder, run the test command to make sure everything is working:
```bash
cargo test -p flashpoint-archive
```

If you want to change functionality, then modify the files inside `crates/flashpoint-archive/` and remember to add tests to cover any new functionality.

To test these changes inside launcher development, first go into `bindings/binding-node/` and build the binding

```bash
cd ./bindings/binding-node/
npm install
npm run build
```

Then link it to the global packages

```bash
npm link
```

Finally, go into your `launcher` folder and add the linked package
```
npm link @fparchive/flashpoint-archive
```

Now your launcher development environment will use the copy produced from the `binding-node` folder when compiling / running. You will need to run `npm run build` inside `binding-node` again whenever you make changes to the database API in `crates/flashpoint-archive/`

Whenever you run `npm install` you will have to run this link command again to set it back up.

### Next Steps

Carry on to [Git Workflow](gitworkflow) to learn how to structure your contributions.