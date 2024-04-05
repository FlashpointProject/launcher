# Language Support

Support for multiple languages comes built in. The translation files in the repo under `/lang` are compiled from the [Crowdin project](https://crowdin.com/project/flashpoint-launcher), which is based off the `develop` branch's `lang/en.json` as a base.

## Using translations in your components

Strings for the current user selected language are available in the context. Just use it via the hook.

```tsx
import { LangContext } from '@renderer/util/lang';

function BoringTextBox() {
  // Load the context
  const strings = React.useContext(LangContext);

  // Pretend we're loading by returning `Loading` :^)
  return (
    <div>
      { strings.misc.loading }
    </div>
  )
}
```

Understanding what strings are available may be a bit confusing. If you want to use existing strings it may be easier to look in `lang/en.json` for the keys and their English text.

### Substitutions

Strings can have text substitutions by adding number placeholders like `{0}` to the text. This can be replaced with either text, or a JSX Element at runtime.

For example, on the Home page we fill in the placeholder with a link which opens the Games browse page, by passing the `allGamesInfo` string and the `Link` component to the `formatString` function.

```json title="lang/en.json"
"allGamesInfo": "Looking for something to play? View {0}.",
```

```tsx title="src/renderer/components/pages/HomePage.tsx"
export function HomePage(props: HomePageProps) {
  // ...
  const renderedQuickStart = React.useMemo(() => {
    // ...
    <QuickStartItem icon='play-circle'>
        {formatString(strings.allGamesInfo, 
          <Link to={joinLibraryRoute(ARCADE)} onClick={onAllGamesClick}>
            {strings.allGames}
          </Link>)}
      </QuickStartItem>
  }, [...]);
}
```

## Adding new strings

To add new strings, we need to do two things:
- Add a key to `langTemplate` in `src/shared/lang.ts`
- Add the English translation to `lang/en.json`

This should be relatively straight forward. All keys must be inside a single level of nesting, where the parent is an arbitrary name usually relating to where the text is used. (e.g `home` is used for most strings that belong on the Home page)

Once these have been commited to the `develop` branch they will automatically be available for translators to work on.

```ts title="src/shared/lang.ts"
const langTemplate = {
  // ...
  home: [
    // ...
    'quickStartHeader'
  ]
}
```

```json title="lang/en.json"
{
  "name": "English",
  "home": {
    "quickStartHeader": "Quick Start"
  }
}
```