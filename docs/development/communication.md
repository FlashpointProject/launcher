# Front / Back Communication

## Overview

FPL has a Nodejs process running as the 'backend' of the application, and an Electron window running as the 'frontend' of the application. The logic for these is seperated between `src/back/` and `src/renderer/`

When the frontend needs something, for example the information for a game associated with an ID, it makes a structured request which the backend will fulfill. All requests are asynchronous. A list of these request types, their arguments and their return values can be found in ``src/shared/back/types.ts`.

**Note:** For the frontend, the socket client used to send/receive messages is a global object at `window.Shared.back` so can be requested anywhere.

Frontend basic request example to fetch a game's info: 
```tsx
const game = await window.Shared.back.request(BackIn.GET_GAME, 'abcd-1234');
```

Backend basic request example to open an alert dialog on all clients:
```ts
state.socketServer.broadcast(BackOut.OPEN_ALERT, 'Hello, I am the backend!');
```

## Adding a new type of request

Adding a new type of request is fairly straightforward. For this example let's create an event that returns a random number up to a maximum defined by the user

All the definitions are in `src/shared/back/types.ts` so let's open that up first.

Next, since we're sending a request *in* to the backend, we should find `BackIn`. If we were broadcasting from the backend to all clients, we'd use `BackOut`.

Then we're going to add a new name for our request type at the bottom, `RANDOM_NUMBER`

```ts title="src/shared/back/types.ts"
export enum BackIn {
  ...
  RANDOM_NUMBER,
}
```

Next, we need to define the shape of request. We'll let the user decide the maximum size of the number returned. We can do this in `BackInTemplate` slightly further down the file.

We want to be able to give a `maxSize` value to decide how big the generated number can be, then we want to get a `number` returned back to us. We can define this a function type like `(maxSize: number) => number`

**Note:** Since all communication is asynchronous you do not need to wrap the response type in `Promise<>` even if the function that will be responding to it from the backend later is async, as this will be inferred automatically.

```ts title="src/shared/back/types.ts"
export type BackInTemplate = SocketTemplate<BackIn, {
  ...
  [BackIn.RANDOM_NUMBER]: (maxSize: number) => number;
}>
```

With this done, you should be all set to make the request for a random number up to 10 from the frontend like so.

```ts 
const randomNum = await window.Shared.back.request(BackIn.RANDOM_NUMBER, 10);
```

**However, The backend doesn't know how to respond to this request yet**, so it'll return an error. For this we'll have to head to `src/back/responses.ts`

Here we'll register a new funtion to respond to this request inside the `registerRequestCallbacks` function. It will automatically infer the argument types and return type.

```ts title="src/back/responses.ts"
export function registerRequestCallbacks(state: BackState, init: () => Promise<void>): void {
  ...

  state.socketServer.register(BackIn.RANDOM_NUMBER, (event, maxSize) => {
    // Generate a whole number between 0 and maxSize (inclusive)
    return Math.floor(
      Math.random() * (maxSize + 1)
    );
  });
}
```

Now the backend will register this callback at startup, and it will run and return in response to requests made by the frontend with your newly defined request type.

The function can be considered `(event, ...args) => ReturnType` where `event` is information about the client that sent it, and the rest is inferred from 
`event` is always the first argument and contains information about the client that sent it, whilst the rest of the arguments and return type are taken from the `BackInTemplate` entry defined earlier. (In this case, `(maxSize: number) => number`)

## Practical Example

When writing a new page, you may need to request a set of random games to list. You could request these just once when the page appears.

```tsx 
export function RandomGameNames() {
  // Have the useState hook to keep the games list stateful
  const [setGames, games] = React.useState<Game[]>([]);
  // useEffect runs only once when the page mounts since it has no dependencies `[]`
  React.useEffect(() => {
    // Using the defined BackIn.RANDOM_GAMES type, request some games from the backend
    window.Shared.back.request(BackIn.RANDOM_GAMES, {
      count: 10,
      excludedLibraries: ['theatre']
    })
    .then(games => {
      // Use the returned Game[] object
      setGames(games)
    });
  }, [])

  return (
    <div>
      {games.map((game, idx) => {
        /** Render all the games in a row. 
          * Remember that you must have a unique `key` prop when rendering lists 
          * We can use the index number here
          * Sometimes you may want to use something else, like the game ID
          */
        return (
          <div key={idx}>Random Game: {game.title}</div>
        )
      })}
    </div>
  )
}
```