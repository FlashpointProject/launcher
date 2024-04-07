# Expanding Ext API

## Overview

Launcher extensions allow people to add new functionality to the Launcher without requiring to build their own versions from the source. During Launcher development it can be good to expose functionality which would be useful to extensions, which is where the extensions API comes in.

Flashpoint Launher's extensions API is defined by the shape of `typings/flashpoint-launcher.d.ts`. Adding functionality is fairly easy and doesn't require intimate knowledge of how the API is served, however I've outlined how the API is served to the extension because it can sometimes help.

- Launcher registers a Node Module Interceptor for `flashpoint-launcher` (See `src/back/extensions/NodeInterceptor.ts` for details)
- Launcher runs the extensions `activate` function
- Extension tries to import `flashpoint-launcher`, the Interceptor gets control of the request instead.
- Interceptor passes the extensions details to `createApiFactory` in `src/back/ApiImplementation.ts`, which returns an object in the shape of the extensions API.
- Extension can now use this API object it was given

Since the API is created during import for each module, the functions you implement are effectively sandboxed and you may wish to take advantage of that. Objects like the `state` variable passed to `createApiFactory` is still shared between API implementation.

This approach was built from VSCode's own extensions system, whilst not identical some of the principles remain the same in both.

:::note

When adding new functions and constants to the API, you must define all the typings in the API typings file itself, you cannot import from other files or modules. The only imports that work are from node APIs.

:::

## Adding a new function

To add a new function, you need to do 2 things:
- Add the definition to the API typings in `typings/flashpoint-launcher.d.ts`
- Add the implementation to `createApiFactory` in `src/back/ApiImplementation.ts`

For example, if we want to add a function that shows an alert to the user, first we add the definition:

```typescript title="typings/flashpoint-launcher.d.ts"
declare module 'flashpoint-launcher' {
  // ...
  namespace dialogs {
    // ...
    function showAlert(message: string): void;
  }
}
```

Next, we find the `dialogs` namespace object in `createApiFactory` and add our implementation

```typescript title="src/back/ApiImplementation.ts"
export function createApiFactory(extId: string, extManifest: IExtensionManifest, addExtLog: (log: ILogEntry) => void, version: string, state: BackState, extPath?: string): typeof flashpoint {
  // ...
  const extDialogs: typeof flashpoint.dialogs = {
    // ...
    showAlert: (message) => state.socketServer.broadcast(BackOut.OPEN_ALERT, message),
  }
}
```

Since we have access to some extension information, we can also choose to show which extension sent the alert if we want to:

```typescript
showAlert: (message) => state.socketServer.broadcast(BackOut.OPEN_ALERT, `${extManifest.displayName} - ${message}`),
```