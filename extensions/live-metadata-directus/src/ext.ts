import * as flashpoint from 'flashpoint-launcher';
import { default as axios } from 'axios';

export async function activate(context: flashpoint.ExtensionContext) {
  const providerFactory = (opts: flashpoint.MetadataProviderOptions): flashpoint.IMetadataProviderInstance => {
    const instance = new DirectusMetadataProviderInstance(opts.configString, 'directus-provider');
    return instance;
  };

  const validateProviderInstance = async (baseUrl: string) => {
    const testEndpoints = [
      `${baseUrl}items/games?limit=0`,
      `${baseUrl}items/game_data?limit=0`,
      `${baseUrl}items/tag?limit=0`,
      `${baseUrl}items/tag_alias?limit=0`,
      `${baseUrl}items/tag_category?limit=0`,
    ];
    try {
      await axios.get(`${baseUrl}server/ping`, { timeout: 5000 });
    } catch (err) {
      throw `Server Ping Failure:\n  Endpoint: ${err.config.url}\n  Error: ${err}`;
    }
    try {
      for (const endpoint of testEndpoints) {
        await axios.get(endpoint, { timeout: 10000 });
      }
    } catch (err) {
      // Failed to load endpoint
      throw `Endpoint did not return expected response:\n  Endpoint: ${err.config.url}\n  Error: ${err}`;
    }
    return true;
  };

  flashpoint.registerDisposable(
    context.subscriptions,
    flashpoint.commands.registerCommand('metadata-directus.create-provider-instance', providerFactory)
  );

  flashpoint.registerDisposable(
    context.subscriptions,
    flashpoint.commands.registerCommand('metadata-directus.validate-provider-instance', validateProviderInstance)
  );
}

class DirectusMetadataProviderInstance implements flashpoint.IMetadataProviderInstance {
  private baseUrl: string;
  private gamesEndpoint: string;
  private tagsEndpoint: string;
  private tagCategoriesEndpoint: string;

  constructor(
    private configString: string,
    private providerId: string,
  ) {
    flashpoint.log.debug(`Creating Instance with opts: ${configString}`);
    this.baseUrl = configString;
    this.gamesEndpoint = `${this.baseUrl}items/games`;
    this.tagsEndpoint = `${this.baseUrl}items/tag`;
    this.tagCategoriesEndpoint = `${this.baseUrl}items/tag_category`;
  }

  private setLastUpdate = () => {
    flashpoint.setExtConfigValue(`metadata-directus.last-updated-${this.configString}`, Date.now());
  }

  public getLastUpdate = () => {
    const lastUpdate = flashpoint.getExtConfigValue(`metadata-directus.last-updated-${this.configString}`) || 0;
    flashpoint.log.debug(`lastUpdate: ${lastUpdate}`);
    return lastUpdate;
  }

  public fetchUpdate = async () => {
    flashpoint.log.debug('fetchUpdate');
    const lastUpdate = this.getLastUpdate();
    try {
      const newGames = (await axios.get(this.gamesEndpoint + `?limit=0&meta=*&filter[dateAdded][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.meta.filter_count;
      const modifiedGames = (await axios.get(this.gamesEndpoint + `?limit=0&meta=*&filter[dateModified][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.meta.filter_count;
      const modifiedTags = (await axios.get(this.tagsEndpoint + `?limit=0&meta=*&filter[dateModified][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.meta.filter_count;
      // Updated games = modified games - new games
      if (modifiedGames > 0) {
        return {
          updateAvailable: true,
          previewText: `**New Games:** ${newGames}\n\n**Updated Games:** ${modifiedGames - newGames}\n\n**Updated Tags:** ${modifiedTags}`
        };
      } else {
        return {
          updateAvailable: false,
          previewText: 'No Updates Found'
        };
      }
    } catch (err) {
      flashpoint.log.error(`Error checking for metadata update ${this.baseUrl}\n${err}`);
      return {
        updateAvailable: false,
        previewText: 'Error checking for Metadata Update, see Logs page'
      };
    }
  };

  public executeUpdate = async (opts: flashpoint.MetadataProviderUpdateOptions) => {
    flashpoint.log.info('Executing Update for ' + this.configString);
    const lastUpdate = this.getLastUpdate();

    const modifiedGames = (await axios.get(this.gamesEndpoint + `?limit=0&meta=*&filter[dateModified][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.meta.filter_count;
    const modifiedGamesPages = Math.ceil(modifiedGames / 500);

    const modifiedTags = (await axios.get(this.tagsEndpoint + `?limit=0&meta=*&filter[dateModified][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.meta.filter_count;
    const modifiedTagsPages = Math.ceil(modifiedTags / 500);

    const fetchTags = async (page: number): Promise<any[]> => {
      return (await axios.get(this.tagsEndpoint + `?limit=500&fields[]=*,aliases.name,aliases.id&page=${page}&filter[dateModified][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.data;
    };

    const fetchGames = async (page: number): Promise<any[]> => {
      return (await axios.get(this.gamesEndpoint + `?limit=500&fields[]=*,tags.tag_id.primaryAliasId.name&page=${page}&filter[dateModified][_gt]=${(new Date(lastUpdate)).toISOString()}`)).data.data;
    };

    if (opts.syncTags) {
      flashpoint.log.info('Syncing Tag Categories...');
      const tagCategories: DirectusTagCategory[] = (await axios.get(this.tagCategoriesEndpoint + '?limit=1000')).data.data;
      const savedTagCategories = await flashpoint.tags.findTagCategories();
      for (const cat of tagCategories.filter(t => savedTagCategories.findIndex(existing => existing.name === t.name) === -1)) {
        savedTagCategories.push(await flashpoint.tags.createTagCategory(cat.name, cat.color));
      }
      flashpoint.log.info('Syncing Tags...');
      for (let page = 1; page <= modifiedTagsPages; page++) {
        flashpoint.log.info(`Tags Page ${page} of ${modifiedTagsPages}`);
        const data: DirectusTag[] = await fetchTags(page);
        for (const t of data) {
          // Create / Find existing tag
          const primaryAlias = t.aliases.find(a => a.id === t.primaryAliasId);
          if (!primaryAlias) {
            flashpoint.log.error('Illegal tag structure! Alias id - ' + t.primaryAliasId);
            continue;
          }
          let tag = await flashpoint.tags.findTag(primaryAlias.name);
          if (!tag) {
            // Try checking by ID
            flashpoint.log.debug(`Alias ${primaryAlias.name} doesn't exist but tag does, trying ID instead ${t.id}`);
            tag = await flashpoint.tags.getTagById(t.id);
            if (tag) {
              const newAlias = await flashpoint.tags.createTagAlias(tag.id, primaryAlias.name);
              tag.primaryAlias = newAlias;
              tag.aliases.push(newAlias);
            }
          }
          if (!tag && primaryAlias.name !== '') {
            // Tag doesn't exist, make a new one
            tag = await flashpoint.tags.createTag(primaryAlias.name, t.categoryId.name);
          } else {
            if (tag.primaryAlias.name !== primaryAlias.name) {
              // Make this the new primary alias if not set already
              const existingAlias = tag.aliases.find(a => a.name === primaryAlias.name);
              if (existingAlias) {
                tag.primaryAlias = existingAlias;
              } else {
                tag.primaryAlias = await flashpoint.tags.createTagAlias(tag.id, primaryAlias.name);
              }
            }
          }
          const matchingCategory = savedTagCategories.find(c => c.name === t.categoryId.name);
          if (matchingCategory) {
            tag.categoryId = matchingCategory.id;
          }
          // Make sure all Directus found aliases match this tag (where it won't remove an existing tag)
          for (const alias of t.aliases.filter(a => a.id !== primaryAlias.id)) {
            const aliasTag = await flashpoint.tags.findTag(alias.name);
            if (!aliasTag) {
              // Alias doesn't exist on a tag already, add it to the new one
              tag.aliases.push(await flashpoint.tags.createTagAlias(tag.id, alias.name));
              continue;
            }
            if (aliasTag.id !== tag.id) {
              // Alias is on another tag, remove it
              if (aliasTag.aliases.length === 1) {
                // Only one alias, can't remove without deleting tag, abort alias move!
                flashpoint.log.debug(`Failed to move alias ${alias.name} because it's the sole alias of another tag, skipping alias move`);
              } else {
                // Tag can exist without alias, remove it from existing tag
                const existingAlias = aliasTag.aliases.find(a => a.name === alias.name);
                aliasTag.aliases = aliasTag.aliases.filter(a => a.name !== alias.name);
                if (aliasTag.primaryAlias.name === alias.name) {
                  aliasTag.primaryAlias = aliasTag.aliases[0];
                }
                await flashpoint.tags.saveTag(aliasTag);
                // Add to this new tag
                tag.aliases.push({
                  ...existingAlias,
                  tagId: tag.id
                });
              }
            }
          }
          await flashpoint.tags.saveTag(tag);
        }
      }
    }

    if (opts.syncGames) {
      flashpoint.log.info('Syncing Games...');
      for (let page = 1; page <= modifiedGamesPages; page++) {
        flashpoint.log.info(`Games Page ${page} of ${modifiedGamesPages}`);
        const data: DirectusGame[] = await fetchGames(page);
        // Convert to Flashpoint Game and Insert / Update
        try {
          const games: flashpoint.Game[] = await Promise.all(data.map<Promise<flashpoint.Game>>(async (d) => {
            let game = await flashpoint.games.findOrCreateGame(d.id);
            game = {
              ...game,
              id: d.id,
              title: d.title,
              alternateTitles: d.alternateTitles,
              series: d.series,
              developer: d.developer,
              publisher: d.publisher,
              dateAdded: d.dateAdded,
              dateModified: d.dateModified,
              platform: d.platform,
              playMode: d.playMode,
              status: d.status,
              notes: d.notes,
              source: d.source,
              applicationPath: d.applicationPath,
              launchCommand: d.launchCommand,
              releaseDate: d.releaseDate,
              version: d.version,
              originalDescription: d.originalDescription,
              language: d.language,
              library: d.library,
              tags: (await Promise.all(d.tags.map(async(t) => {
                const name = t.tag_id.primaryAliasId.name;
                let tag = await flashpoint.tags.findTag(name);
                if (!tag && name !== '') {
                  // Tag doesn't exist, make a new one
                  tag = await flashpoint.tags.createTag(name);
                }
                return tag;
              }))).filter(t => !!t)
            };
            return game;
          }));
          await flashpoint.games.updateGames(games);
        } catch (err) {
          flashpoint.log.error(`Error Syncing Page: ${err}`);
        }
      }
    }
    flashpoint.log.info('Finished Update');
    this.setLastUpdate();
  };
}

type DirectusTag = {
  id: number;
  dateModified: string;
  primaryAliasId: number;
  categoryId: {
    name: string;
  };
  description?: string;
  aliases: Array<{
    name: string;
    id: number;
  }>;
};

type DirectusGame = {
  id: string;
  parentGameId?: string;
  title?: string;
  alternateTitles?: string;
  series?: string;
  developer?: string;
  publisher?: string;
  dateAdded: string;
  dateModified: string;
  platform?: string;
  playMode?: string;
  status?: string;
  notes?: string;
  source?: string;
  applicationPath?: string;
  launchCommand?: string;
  releaseDate?: string;
  version?: string;
  originalDescription?: string;
  language?: string;
  library: string;
  message?: string;
  logo?: string;
  screenshot?: string;
  lastUpdatedBy?: string;
  activeDataId?: number;
  tags: Array<{
    tag_id: {
      primaryAliasId: {
        name: string;
      }
    };
  }>
};

type DirectusTagCategory = {
  id: string;
  name: string;
  color: string;
  description?: string;
};
