# Introduction

### Overview

This section is here to explain the architecture of the Flashpoint Launcher at a technical level, and the common practices you'll probably use when making contributions.

It's been written to document the techniques and systems that have been developed over time to create the launcher software. Try not to treat it as a hard and fast rule on what is accepted, but more of a helpful reference.

The documentation assumes you have a basic understanding of Typescript, React and Nodejs. Whilst it will sometimes point out specific functions from these APIs and mention what they do, you are expected to either understand them already or be willing to look them up in their own documentation.


## Setup and Contributions

See [Setup](setup) to set up your development environment.

See [Git Workflow](gitworkflow) to learn how to start committing and merging your contributions.

## Future Considerations

**React 17** - React 18 comes with breaking changes, so hasn't been worked on. A migratory pull request would be welcome, otherwise the plan is to wait for React 19 so we can reap the benefits of the React Compiler.

**Electron 19** - Electron 19 is very outdated now but does the job fine.If there becomes a need for more modern Chromium functionality, then Electron will have to update and drop the Flash support in browser mode.

## Essential Reading

Whilst some concepts are only used on occasion, there are some things you'll want to come back and reference frequently.

- [Front / Back Communication](communication) - Almost everything you do will involve sending data between the frontend and backend, so this is vital to understand.
- [Database API](database) - Interacting with the Database API is common place in the backend.