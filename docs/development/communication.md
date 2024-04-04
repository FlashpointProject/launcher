# Front / Back Communication

### Overview

FPL has a Nodejs process running as the 'backend' of the application, and an Electron window running as the 'frontend' of the application. The logic for these is seperated between `src/back/` and `src/renderer/`

When the frontend needs something, for example the information for a game associated with an ID, it makes a structured request which the backend will fulfill. All requests are asynchronous.

**Note:** For the frontend, the socket client used to send/receive messages is a global object at `window.Shared.back` so can be requested anywhere.

Frontend request example to fetch a game's info: 
```typescript
const game = await window.Shared.back.request(BackIn.GET_GAME, 'abcd-1234');
```

Backend request example to open an alert dialog on all clients:
```typescript
state.socketServer.broadcast(BackOut.OPEN_ALERT, 'Hello, I am the backend!');
```

### Adding a new type of request

Adding a new type of request is fairly straightforward. For this example let's create an event that returns a random number up to a maximum defined by the user

All the definitions are in `src/shared/back/types.ts` so let's open that up first.

Next, since we're sending a request *in* to the backend, we should find `BackIn`. If we were broadcasting from the backend to all clients, we'd use `BackOut`.

Then we're going to add a new name for our request type at the bottom, `RANDOM_NUMBER`

```typescript
export enum BackIn {
  ...
  RANDOM_NUMBER,
}
```

Next, we need to define the shape of request. We'll let the user decide the maximum size of the number returned. We can do this in `BackInTemplate` slightly further down the file.

We want to be able to give a `maxSize` value to decide how big the generated number can be, then we want to get a `number` returned back to us. We can define this a function type like `(maxSize: number) => number`

**Note:** Since all communication is asynchronous you do not need to wrap the response type in `Promise<>` even if the function that will be responding to it from the backend later is async, as this will be inferred automatically.

```typescript
export type BackInTemplate = SocketTemplate<BackIn, {
  ...
  [BackIn.RANDOM_NUMBER]: (maxSize: number) => number;
}>
```

With this done, you should be all set to make the request for a random number up to 10 from the frontend like so.

```typescript
const randomNum = await window.Shared.back.request(BackIn.RANDOM_NUMBER, 10);
```

**However, The backend doesn't know how to respond to this request yet**, so it'll return an error. For this we'll have to head to `src/back/responses.ts`

Here we'll register a new funtion to respond to this request inside the `registerRequestCallbacks` function. It will automatically infer the argument types and return type.

```typescript
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