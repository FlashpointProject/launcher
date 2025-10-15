import { ModelUtils } from '@shared/game/util';
import { deepCopy, generateTagFilterGroup } from '@shared/Util';
import { AdditionalApp, Platform, Tag, TagSuggestion } from 'flashpoint-launcher';
import { GameComponentProps } from 'flashpoint-launcher-renderer';
import { GameComponentInputField } from './DisplayComponent';
import { DropdownInputField, DropdownInputFieldMapped } from './DropdownInputField';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';
import { OpenIcon } from './OpenIcon';
import { mapRuffleSupportString } from '@shared/utils/misc';
import { TagInputField } from './TagInputField';
import { useState } from 'react';
import { InputElement } from './InputField';
import { BackIn } from '@shared/back/types';
import { getPlatformIconURL } from '@renderer/Util';
import { uuid } from '@shared/utils/uuid';

export function GameComponentAlternateTitles(props: GameComponentProps) {
  const { lang, game, updateGame } = props;
  return <GameComponentInputField
    header={lang.browse.alternateTitles}
    text={game.alternateTitles}
    placeholder={lang.browse.noAlternateTitles}
    onChange={(value) => updateGame({ alternateTitles: value })}
    {...props} />;
}

export function GameComponentSeries(props: GameComponentProps) {
  const { editable, lang, game, updateGame, doSearch } = props;
  return <GameComponentInputField
    header={lang.browse.series}
    text={game.series}
    placeholder={lang.browse.noSeries}
    onClick={() => { if (!editable) { doSearch(`series=${game.series}`); }}}
    onChange={(value) => updateGame({ series: value })}
    {...props} />;
}

export function GameComponentPublisher(props: GameComponentProps) {
  const { editable, lang, game, updateGame, doSearch } = props;
  return <GameComponentInputField
    header={lang.browse.publisher}
    text={game.publisher}
    placeholder={lang.browse.noPublisher}
    onClick={() => { if (!editable) { doSearch(`publisher=${game.publisher}`); }}}
    onChange={(value) => updateGame({ publisher: value })}
    {...props} />;
}

export function GameComponentSource(props: GameComponentProps) {
  const { lang, game, updateGame } = props;
  return <GameComponentInputField
    header={lang.browse.source}
    text={game.source}
    placeholder={lang.browse.noSource}
    onChange={(value) => updateGame({ source: value })}
    {...props} />;
}

export function GameComponentVersion(props: GameComponentProps) {
  const { lang, game, updateGame } = props;
  return <GameComponentInputField
    header={lang.browse.version}
    text={game.version}
    placeholder={lang.browse.noVersion}
    onChange={(value) => updateGame({ version: value })}
    {...props} />;
}

export function GameComponentLanguage(props: GameComponentProps) {
  const { editable, lang, game, updateGame, doSearch } = props;
  return <GameComponentInputField
    header={lang.browse.language}
    text={game.language}
    placeholder={lang.browse.noLanguage}
    onClick={() => { if (!editable) { doSearch(`language=${game.publisher}`); }}}
    onChange={(value) => updateGame({ language: value })}
    {...props} />;
}

export function GameComponentPlayMode(props: GameComponentProps) {
  const { editable, suggestions, lang, game, updateGame, doSearch } = props;
  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.playMode}: </p>
      <DropdownInputField
        text={game.playMode}
        placeholder={lang.browse.noPlayMode}
        onChange={(event) => updateGame({ playMode: event.currentTarget.value })}
        className='browse-right-sidebar__searchable'
        editable={editable}
        onClick={() => { if (!editable) { doSearch(`playMode=${game.playMode}`); }}}
        items={suggestions && filterSuggestions(suggestions.playMode) || []}
        onItemSelect={text => updateGame({ playMode: text })} />
    </div>
  );
}

export function GameComponentStatus(props: GameComponentProps) {
  const { editable, suggestions, lang, game, updateGame, doSearch } = props;
  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.status}: </p>
      <DropdownInputField
        text={game.status}
        placeholder={lang.browse.noStatus}
        onChange={(event) => updateGame({ status: event.currentTarget.value })}
        className='browse-right-sidebar__searchable'
        editable={editable}
        onClick={() => { if (!editable) { doSearch(`status=${game.status}`); }}}
        items={suggestions && filterSuggestions(suggestions.status) || []}
        onItemSelect={text => updateGame({ status: text })} />
    </div>
  );
}

function formatSidebarDate(date: string): string {
  const d = new Date(date);
  try {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  } catch {
    return date;
  }
}

export function GameComponentDates(props: GameComponentProps) {
  const { editable, lang, game, updateGame } = props;

  if (editable) {
    return (
      <GameComponentInputField
        header={lang.browse.releaseDate}
        text={game.releaseDate}
        placeholder={lang.browse.noReleaseDate}
        onChange={(value) => updateGame({ releaseDate: value })}
        {...props} />
    );
  } else {
    return (
      <div className='browse-right-sidebar__section'>
        <div className='browse-right-sidebar__stats'>
          <div className='browse-right-sidebar__stats-box'>
            <div className='browse-right-sidebar__stats-row-top'>
              <div className='browse-right-sidebar__stats-cell'>
                {lang.browse.dateAdded}
              </div>
            </div>
            <div className='browse-right-sidebar__stats-row-bottom'>
              <div className='browse-right-sidebar__stats-cell'>
                {formatSidebarDate(game.dateAdded)}
              </div>
            </div>
          </div>
          <div className='browse-right-sidebar__stats-box'>
            <div className='browse-right-sidebar__stats-row-top'>
              <div className='browse-right-sidebar__stats-cell'>
                {lang.browse.dateModified}
              </div>
            </div>
            <div className='browse-right-sidebar__stats-row-bottom'>
              <div className='browse-right-sidebar__stats-cell'>
                {formatSidebarDate(game.dateModified)}
              </div>
            </div>
          </div>
          <div className='browse-right-sidebar__stats-box'>
            <div className='browse-right-sidebar__stats-row-top'>
              <div className='browse-right-sidebar__stats-cell'>
                {lang.browse.releaseDate}
              </div>
            </div>
            <div className='browse-right-sidebar__stats-row-bottom'>
              <div className={`browse-right-sidebar__stats-cell ${game.releaseDate ? '' : 'browse-right-sidebar__stats-cell-placeholder simple-disabled-text'}`}>
                {game.releaseDate ? formatSidebarDate(game.releaseDate) : lang.browse.noneFound}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export function GameComponentOriginalDescription(props: GameComponentProps) {
  const { lang, game, updateGame } = props;

  return (
    <GameComponentInputField
      header={lang.browse.originalDescription}
      text={game.originalDescription}
      placeholder={lang.browse.noOriginalDescription}
      multiline={true}
      onChange={(value) => updateGame({ originalDescription: value })}
      {...props} />
  );
}

export function GameComponentLegacyData(props: GameComponentProps) {
  const { lang, game, editable, suggestions, updateGame } = props;

  if (!game.activeDataId) {
    return (
      <div className='browse-right-sidebar__section'>
        <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
          <p>{lang.browse.applicationPath}: </p>
          <DropdownInputField
            text={game.legacyApplicationPath}
            placeholder={lang.browse.noApplicationPath}
            onChange={(event) => updateGame({ legacyApplicationPath: event.currentTarget.value })}
            editable={editable}
            items={suggestions && filterSuggestions(suggestions.applicationPath) || []}
            onItemSelect={text => updateGame({ legacyApplicationPath: text })} />
        </div>
        <GameComponentInputField
          header={lang.browse.launchCommand}
          text={game.legacyLaunchCommand}
          placeholder={lang.browse.noLaunchCommand}
          onChange={(value) => updateGame({ legacyLaunchCommand: value })}
          {...props} />
      </div>
    );
  } else {
    return (<></>); // Not a legacy title, do not show data
  }
}

export function GameComponentAddApps(props: GameComponentProps) {
  const { editable, game, lang, updateGame, launchAddApp } = props;

  const onNewAddAppClick = () => {
    if (game) {
      const newAddApp = ModelUtils.createAddApp(game);
      newAddApp.id = uuid();
      const existingAddApps = game.addApps || [];
      updateGame({ addApps: [...existingAddApps, ...[newAddApp]] });
    }
  };

  const onEditAddApp = (addApp: AdditionalApp) => {
    if (game.addApps !== undefined) {
      const addApps = deepCopy(game.addApps);
      const addAppIdx = addApps.findIndex(aa => aa.id === addApp.id);
      if (addAppIdx > -1) {
        addApps[addAppIdx] = addApp;
        updateGame({ addApps });
      }
    }
  };

  const onAddAppDelete = (addAppId: string): void => {
    if (game.addApps !== undefined) {
      const newAddApps = deepCopy(game.addApps);
      const index = newAddApps.findIndex(addApp => addApp.id === addAppId);
      if (index === -1) { throw new Error('Cant remove additional application because it was not found.'); }
      newAddApps.splice(index, 1);
      updateGame({ addApps: newAddApps });
    }
  };

  if (editable || (game.addApps && game.addApps.length > 0)) {
    return (
      <div className='browse-right-sidebar__section'>
        <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-header'>
          <p>{lang.browse.additionalApplications}:</p>
          {editable ? (
            <input
              type='button'
              value={lang.browse.new}
              className='simple-button'
              onClick={onNewAddAppClick} />
          ) : undefined}
        </div>
        {game.addApps && game.addApps.map((addApp) => (
          <RightBrowseSidebarAddApp
            key={addApp.id}
            addApp={addApp}
            editDisabled={!editable}
            onEdit={onEditAddApp}
            onLaunch={launchAddApp}
            onDelete={onAddAppDelete} />
        ))}
      </div>
    );
  } else {
    return (<></>);
  }
}

export function GameComponentPlaylistNotes(props: GameComponentProps) {
  const { playlistGame, lang, updatePlaylistNotes } = props;

  if (playlistGame) {
    return (
      <GameComponentInputField
        header={lang.browse.playlistNotes}
        text={playlistGame.notes}
        placeholder={lang.browse.noPlaylistNotes}
        multiline={true}
        onChange={(value) => updatePlaylistNotes(value)}
        {...props} />
    );
  } else {
    return (<></>);
  }
}

export function GameComponentNotes(props: GameComponentProps) {
  const { lang, game, updateGame } = props;

  return (
    <GameComponentInputField
      header={lang.browse.notes}
      text={game.notes}
      placeholder={lang.browse.noNotes}
      multiline={true}
      onChange={(value) => updateGame({ notes: value })}
      {...props} />
  );
}

export function GameComponentRuffleSupport(props: GameComponentProps) {
  const { editable, lang, game, updateGame, doSearch } = props;

  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.ruffleSupport}: </p>
      <DropdownInputFieldMapped
        text={mapRuffleSupportString(game.ruffleSupport)}
        placeholder={'None'}
        className='browse-right-sidebar__searchable'
        editable={editable}
        items={[{
          key: '',
          value: 'None'
        }, {
          key: 'standalone',
          value: 'Standalone'
        }, {
          key: 'launcher',
          value: 'Launcher Embed'
        }]}
        onClick={() => { if (!editable) { doSearch(`ruffle=${game.ruffleSupport}`); }}}
        onChange={(key) => {
          updateGame({ ruffleSupport: key });
        }} />
      {!editable && game.ruffleSupport !== '' ? (
        <div className='browse-right-sidebar-floating-icon'>
          <OpenIcon icon='check' />
        </div>
      ) : undefined}
    </div>
  );
}

export function GameComponentTags(props: GameComponentProps) {
  const { editable, lang, game, tagCategories, fpfssEditMode, preferences, updateGame, doSearch } = props;
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);

  const onCurrentTagChange = (event: React.ChangeEvent<InputElement>) => {
    const newTag = event.currentTarget.value;
    let newSuggestions: TagSuggestion[] = tagSuggestions;

    if (newTag !== '') {
      // Delayed set
      const existingTags = game.tags;
      window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, newTag, preferences.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !preferences.browsePageShowExtreme)).concat([generateTagFilterGroup(existingTags)]))
      .then(data => {
        if (data) { setTagSuggestions(data); }
      });
    } else {
      newSuggestions = [];
    }

    setCurrentTagInput(newTag);
    setTagSuggestions(newSuggestions);
  };

  const onRemoveTag = (tag: Tag, index: number): void => {
    if (game) {
      const newDetailedTags = deepCopy(!game.detailedTags ? [] : game.detailedTags);
      const newTags = deepCopy(game.tags);
      const tagsIndex = newTags.findIndex(t => t.toLowerCase() === tag.name.toLowerCase());
      if (tagsIndex > -1) {
        newTags.splice(tagsIndex, 1);
      }
      const detailedTagsIndex = newDetailedTags.findIndex(t => t.name.toLowerCase() === tag.name.toLowerCase());
      if (detailedTagsIndex > -1) {
        newDetailedTags.splice(detailedTagsIndex, 1);
      }
      updateGame({ tags: newTags, detailedTags: newDetailedTags });
    }
  };

  const onAddTagSuggestion = (suggestion: TagSuggestion) => {
    window.Shared.back.request(BackIn.GET_TAG_BY_ID, suggestion.id)
    .then((tag) => {
      if (tag) {
        // Ignore dupe tags
        if (game && !game.tags.map(t => t.toLowerCase()).includes(tag.name.toLowerCase())) {
          if (!game.detailedTags) {
            game.detailedTags = [];
          }
          updateGame({ tags: [...game.tags, tag.name], detailedTags: [...game.detailedTags, tag] });
        }
      }
    });

    // Clear out suggestions box and current search
    setTagSuggestions([]);
    setCurrentTagInput('');
  };

  const onAddTagByString = (text: string) => {
    if (text !== '') {
      if (fpfssEditMode) {
        const newTagText = text.trim();
        if (game && !game.tags.map(t => t.toLowerCase()).includes(newTagText.toLowerCase())) {

          const tag: Tag = {
            id: -1,
            name: newTagText,
            aliases: [newTagText],
            description: '',
            dateModified: (new Date()).toISOString(),
            category: 'default'
          };
          updateGame({ tags: [...game.tags, tag.name], detailedTags: [...(!game.detailedTags ? [] : game.detailedTags), tag] });
        }
      } else {
        window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, text)
        .then((tag) => {
          if (tag) {
            // Ignore dupe tags
            if (game && !game.tags.map(t => t.toLowerCase()).includes(tag.name.toLowerCase())) {
              if (!game.detailedTags) {
                game.detailedTags = [];
              }
              updateGame({ tags: [...game.tags, tag.name], detailedTags: [...game.detailedTags, tag] });
            }
          }
        });
      }
    }

    // Clear out suggestions box and current search
    setTagSuggestions([]);
    setCurrentTagInput('');
  };

  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.tags}: </p>
      <TagInputField
        text={currentTagInput}
        placeholder={lang.browse.enterTag}
        className='browse-right-sidebar__searchable'
        editable={editable}
        onChange={onCurrentTagChange}
        tags={game.detailedTags || []}
        suggestions={tagSuggestions}
        categories={tagCategories}
        onTagSelect={(tag) => { if (!editable) { doSearch(`tag="${tag.name}"`); }}}
        onTagEditableSelect={onRemoveTag}
        onTagSuggestionSelect={onAddTagSuggestion}
        onTagSubmit={onAddTagByString} />
    </div>
  );
}

export function GameComponentPlatforms(props: GameComponentProps) {
  const { editable, lang, game, tagCategories, fpfssEditMode, logoVersion, updateGame, doSearch } = props;

  const [currentPlatformInput, setCurrentPlatformInput] = useState('');
  const [platformSuggestions, setPlatformSuggestions] = useState<TagSuggestion[]>([]);

  const renderPlatformIcon = (platform: Platform): React.JSX.Element => {
    const platformIcon = getPlatformIconURL(platform.name, logoVersion);
    return (
      <div
        className='tag-icon tag-icon-image'
        style={{ backgroundImage: `url('${platformIcon}')` }} />
    );
  };

  const renderPlatformIconSugg = (platformSugg: TagSuggestion) => {
    const iconUrl = getPlatformIconURL(platformSugg.name, logoVersion);
    return (
      <div
        className='platform-tag__icon'
        style={{ backgroundImage: `url(${iconUrl})` }} />
    );
  };

  const onCurrentPlatformChange = (event: React.ChangeEvent<InputElement>) => {
    const newPlatform = event.currentTarget.value;
    let newSuggestions: TagSuggestion[] = platformSuggestions;

    if (newPlatform !== '') {
      // Delayed set
      window.Shared.back.request(BackIn.GET_PLATFORM_SUGGESTIONS, newPlatform)
      .then(data => {
        if (data) { setPlatformSuggestions(data); }
      });
    } else {
      newSuggestions = [];
    }

    setCurrentPlatformInput(event.currentTarget.value);
    setPlatformSuggestions(newSuggestions);
  };

  const onRemovePlatform = (platform: Platform, index: number) => {
    if (game) {
      const newDetailedPlatforms = deepCopy(!game.detailedPlatforms ? [] : game.detailedPlatforms);
      const newPlatforms = deepCopy(game.platforms);
      const platIndex = newPlatforms.findIndex(p => p.toLowerCase() === newDetailedPlatforms[index].name.toLowerCase());
      newPlatforms.splice(platIndex, 1);
      newDetailedPlatforms.splice(index, 1);
      updateGame({ platforms: newPlatforms, detailedPlatforms: newDetailedPlatforms });
    }
  };

  const onAddPlatformSuggestion = (suggestion: TagSuggestion) => {
    window.Shared.back.request(BackIn.GET_PLATFORM_BY_ID, suggestion.id)
    .then((platform) => {
      if (platform) {
        // Ignore dupe tags
        if (game && !game.platforms.map(t => t.toLowerCase()).includes(platform.name.toLowerCase())) {
          if (!game.detailedPlatforms) {
            game.detailedPlatforms = [];
          }
          const primary = game.platforms.length === 0 ? platform.name : game.primaryPlatform;
          updateGame({ platforms: [...game.platforms, platform.name], primaryPlatform: primary, detailedPlatforms: [...game.detailedPlatforms, platform] });
        }
      }
    });

    // Clear out suggestions box and current search
    setCurrentPlatformInput('');
    setPlatformSuggestions([]);
  };

  const promotePlatform = (value: string) => {
    if (game?.platforms.includes(value)) {
      updateGame({ primaryPlatform: value });
    }
  };

  const onAddPlatformByString = (text: string) => {
    if (text !== '') {
      if (fpfssEditMode) {
        const newPlatformText = text.trim();
        if (game && !game.platforms.map(t => t.toLowerCase()).includes(newPlatformText.toLowerCase())) {
          const platform: Platform = {
            id: -1,
            name: newPlatformText,
            aliases: [newPlatformText],
            description: '',
            dateModified: (new Date()).toISOString()
          };
          const primary = game.platforms.length === 0 ? platform.name : game.primaryPlatform;
          updateGame({ platforms: [...game.platforms, platform.name], primaryPlatform: primary, detailedPlatforms: [...(!game.detailedPlatforms ? [] : game.detailedPlatforms), platform] });
        }
      } else {
        window.Shared.back.request(BackIn.GET_OR_CREATE_PLATFORM, text)
        .then((platform) => {
          if (platform) {
            // Ignore dupe platforms
            if (game && !game.platforms.map(t => t.toLowerCase()).includes(platform.name.toLowerCase())) {
              if (!game.detailedPlatforms) {
                game.detailedPlatforms = [];
              }
              const primary = game.platforms.length === 0 ? platform.name : game.primaryPlatform;
              updateGame({ platforms: [...game.platforms, platform.name], primaryPlatform: primary, detailedPlatforms: [...game.detailedPlatforms, platform] });
            }
          }
        });
      }
    }

    // Clear out suggestions box and current search
    setCurrentPlatformInput('');
    setPlatformSuggestions([]);
  };

  return (
    <>
      {!editable && (
        <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
          <p>{lang.browse.platform}: </p>
          <TagInputField
            text={''}
            className='browse-right-sidebar__searchable'
            editable={false}
            tags={game.detailedPlatforms?.filter(p => p.name == game.primaryPlatform) || []}
            suggestions={[]}
            categories={[]}
            onTagSelect={(tag) => { if (!editable) { doSearch(`platform="${tag.name}"`); }}}
            renderIcon={renderPlatformIcon}
            renderIconSugg={renderPlatformIconSugg} />
        </div>
      )}
      <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
        <p>{editable ? lang.config.platforms : lang.browse.otherTechnologies}: </p>
        <TagInputField
          text={currentPlatformInput}
          placeholder={lang.browse.enterTag}
          className='browse-right-sidebar__searchable'
          editable={editable}
          onChange={onCurrentPlatformChange}
          tags={editable ? game.detailedPlatforms || [] : game.detailedPlatforms?.filter(p => p.name !== game.primaryPlatform) || []}
          suggestions={platformSuggestions}
          categories={tagCategories}
          onTagEditableSelect={onRemovePlatform}
          onTagSuggestionSelect={onAddPlatformSuggestion}
          onTagSubmit={onAddPlatformByString}
          renderIcon={renderPlatformIcon}
          renderIconSugg={renderPlatformIconSugg}
          primaryValue={game.primaryPlatform}
          selectPrimaryValue={promotePlatform} />
      </div>
    </>
  );
}

function filterSuggestions(suggestions?: string[]): string[] {
  if (!suggestions) { return []; }
  // if (suggestions.length > 25) { return suggestions.slice(0, 25); }
  return suggestions;
}
