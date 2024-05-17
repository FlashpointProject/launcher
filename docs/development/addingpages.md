# Adding Pages

### Overview

When adding a new page please consider whether the functionality can be included in an existing page first.

Adding a new page requires a few steps:
- Create a new functional component in `src/renderer/components/pages` which will render the page. Start with the most basic component first. (e.g `CoolCatPage.tsx`)
- Add a Path value to `src/renderer/Paths.ts` (e.g `CATS = '/cats'`)
- Add a Route with this new Path value in `src/renderer/router.tsx`
  - Searching for `<PropsRoute` is a really easy way to find the right place
- Create an instance of the Props type your components needs immediately above this in `src/renderer/router.tsx` and pass it to the `PropsRoute` you created.
  - You may need to pass additional data from the top level `app.tsx` component. Do this by adding the values to `AppRouterProps` first, then searching for `const routerProps: AppRouterProps = {` and adding them in `app.tsx`

### Practical Example

1. Create a new functional component in `src/renderer/components/pages` which will render the page. Start with the most basic component first.

```tsx title="src/renderer/pages/CoolCatPage.tsx"
export type CoolCatPageProps = {
  platformNames: string[];
}

export function CoolCatPage(props: CoolCatPageProps) {
  // Pick a random platform name to use
  const platformIdx = Math.floor(Math.random() * props.platformNames.length);
  const platform = props.platformNames[platformIdx];

  // Show `I'm a Flash cat!` or something equivalent on screen
  return (
    <div>
      {`I'm a ${platform} cat!`}
    </div>
  )
}
```

2. Add a Path value to `src/renderer/Paths.ts` (e.g `CATS = '/cats'`)

```ts title="src/renderer/Paths.ts"
export enum Paths = {
  // ...
  CATS = '/cats'
}
```

3. Add a Route with this new Path value in `src/renderer/router.tsx`, create an instance of the Props type your components needs immediately above this in `src/renderer/router.tsx` and pass it to the `PropsRoute` you created.

```tsx title="src/renderer/router.tsx"
export type AppRouterProps = {
  // ...
  platforms: string[]; // This already exists, following the example we'll assume it doesn't
}

export class AppRouter extends React.Component<AppRouterProps> {
  render() {
    // ...
    const coolCatProps: CoolCatPageProps = {
      platformNames: this.props.platforms, // platforms is already here, so we can use that
    }
    // ...
    return (
      <Switch>
        { /* ... */ }
        <PropsRoute
          path={Paths.CATS}
          component={CoolCatPage}
          { ...coolCatProps }
        />
        <Route component={NotFoundPage} />
      </Switch>
    );
  }
}
```

4. If you don't have access to the data required for your component props, then add them to the Router props and send them from `app.tsx`. 

Alternatively you may consider not having them as props, but fetching them only once via a backend request when the component mounts. (See React's `useState` and `useEffect` hooks)

Assuming the data exists in the scope of `App`, we can get it from the main state.

```tsx title="src/renderer/app.tsx"
  render() {
    // ...
    const routerProps: AppRouterProps = {
      // ...
      platforms: this.props.main.platforms // Assuming this exists on the main state
    }
  }
```