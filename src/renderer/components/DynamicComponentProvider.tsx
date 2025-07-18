import { loadRemote, preloadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { ComponentType, createContext, lazy, ReactNode, useEffect, useState } from 'react';
import { DynamicComponent } from './DynamicComponent';
import { GameComponentAddApps, GameComponentAlternateTitles, GameComponentDates, GameComponentLanguage, GameComponentLegacyData, GameComponentNotes, GameComponentOriginalDescription, GameComponentPlatforms, GameComponentPlaylistNotes, GameComponentPlayMode, GameComponentPublisher, GameComponentRuffleSupport, GameComponentSeries, GameComponentSource, GameComponentStatus, GameComponentTags, GameComponentVersion } from './GameComponents';
import { GameListHeaderDeveloper, GameListHeaderPlatform, GameListHeaderPublisher, GameListHeaderTitle, GameListRowDeveloper, GameListRowPlatform, GameListRowPublisher, GameListRowTitle } from './GameListComponents';
import { HomePageComponentExtras, HomePageComponentGotd, HomePageComponentNotes, HomePageComponentQuickStart, HomePageComponentRandomGames, HomePageComponentUpdateFeed } from './HomePageComponents';

export type RemoteModule = {
  scope: string,
  url: string,
};
type ComponentMap = Record<string, React.ComponentType<any>>;

type DynamicComponentProviderProps = {
  manifests: RemoteModule[];
  children: ReactNode;
}

export const DynamicComponentContext = createContext<{
  getComponent:(name: string) => React.ComponentType<any>;
}>({
      getComponent: () => () => <></>
    });

const DEFAULT_COMPONENT_MAP: ComponentMap = {
  'game_alternateTitles': GameComponentAlternateTitles,
  'game_tags': GameComponentTags,
  'game_platforms': GameComponentPlatforms,
  'game_series': GameComponentSeries,
  'game_publisher': GameComponentPublisher,
  'game_source': GameComponentSource,
  'game_playMode': GameComponentPlayMode,
  'game_status': GameComponentStatus,
  'game_version': GameComponentVersion,
  'game_language': GameComponentLanguage,
  'game_originalDescription': GameComponentOriginalDescription,
  'game_legacyData': GameComponentLegacyData,
  'game_addApps': GameComponentAddApps,
  'game_dates': GameComponentDates,
  'game_notes': GameComponentNotes,
  'game_playlistNotes': GameComponentPlaylistNotes,
  'game_ruffleSupport': GameComponentRuffleSupport,
  'gameCol_header_platform': GameListHeaderPlatform,
  'gameCol_header_title': GameListHeaderTitle,
  'gameCol_header_developer': GameListHeaderDeveloper,
  'gameCol_header_publisher': GameListHeaderPublisher,
  'gameCol_row_platform': GameListRowPlatform,
  'gameCol_row_title': GameListRowTitle,
  'gameCol_row_developer': GameListRowDeveloper,
  'gameCol_row_publisher': GameListRowPublisher,
  'homePage_updateFeed': HomePageComponentUpdateFeed,
  'homePage_gotd': HomePageComponentGotd,
  'homePage_quickStart': HomePageComponentQuickStart,
  'homePage_notes': HomePageComponentNotes,
  'homePage_randomGames': HomePageComponentRandomGames,
  'homePage_extras': HomePageComponentExtras,
};

const initProps = {
  'init': true
};

export function DynamicComponentProvider({ manifests, children }: DynamicComponentProviderProps) {
  const [components] = useState<ComponentMap>(DEFAULT_COMPONENT_MAP);
  const [lazyComponents, setLazyComponents] = useState<Record<string, React.LazyExoticComponent<any>>>({});
  const [loadedManifests, setLoadedManifests] = useState<string[]>([]);

  useEffect(() => {
    const newManifests = manifests.filter(f => !loadedManifests.includes(f.url));

    if (newManifests.length > 0) {
      const loadManifests = async (manifests: RemoteModule[]) => {
        for (const manifest of manifests) {
          try {
            // Register with module federation
            registerRemotes([{
              name: manifest.scope,
              entry: manifest.url,
            }]);
            preloadRemote([{
              nameOrAlias: manifest.scope,
              resourceCategory: 'all',
            }]);
            console.log(`Registered MF Provider with name '${manifest.scope}' to '${manifest.url}'`);
            log.debug('Extensions', `Registered MF Providern with name '${manifest.scope}' to '${manifest.url}'`);
          } catch (err) {
            log.error('Extensions', `Failed to register MF Provider with name '${manifest.scope}' to '${manifest.url}': ${err}`);
          }
        }
      };

      setLoadedManifests(prev => [...prev, ...(newManifests.map(m => m.url))]);
      loadManifests(newManifests);
    }
  }, [manifests]);

  const getComponent = (name: string) => {
    // Check if it's cached
    if (name in lazyComponents) {
      return lazyComponents[name];
    }
    if (name in components) {
      return components[name];
    }

    // Not loaded yet
    const LazyComponent = lazy(async () => {
      return loadRemote(name) as unknown as Promise<{ default: ComponentType<any> }>;
    });
    setLazyComponents((prev) => {
      return {
        ...prev,
        [name]: LazyComponent
      };
    });

    return LazyComponent;
  };

  return (
    <DynamicComponentContext.Provider value={{ getComponent }}>
      <div style={{ display: 'none' }}>
        { manifests.filter(f => loadedManifests.includes(f.url)).map(f => {
          return (<DynamicComponent key={f.scope} name={`${f.scope}/Initializer`} props={initProps}/>);
        })}
      </div>
      {children}
    </DynamicComponentContext.Provider>
  );
}
