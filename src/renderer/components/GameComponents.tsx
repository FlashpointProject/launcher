import { ModelUtils } from '@shared/game/util';
import { deepCopy, generateTagFilterGroup } from '@shared/Util';
import { AdditionalApp, Game, Platform, Tag, TagSuggestion } from 'flashpoint-launcher';
import { GameComponentInputFieldProps, GameComponentProps } from 'flashpoint-launcher-renderer';
import { GameComponentInputField } from './DisplayComponent';
import { DropdownInputField, DropdownInputFieldMapped } from './DropdownInputField';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';
import { OpenIcon } from './OpenIcon';
import { isGame, mapRuffleSupportString } from '@shared/utils/misc';
import { TagInputField } from './TagInputField';
import { useContext, useState } from 'react';
import { InputElement } from './InputField';
import { BackIn } from '@shared/back/types';
import { getPlatformIconURL } from '@renderer/Util';
import { uuid } from '@shared/utils/uuid';
import { LangContext } from '@renderer/util/lang';
import { RootState } from '@renderer/store/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectGameField = <K extends keyof Game>(viewId: string, key: K) => createSelector(
  [
    (state: RootState) => state.search.views[viewId].isEditing,
    (state: RootState) => isGame(state.search.views[viewId].selectedGame) ? state.search.views[viewId].selectedGame[key] : undefined,
    (state: RootState) => isGame(state.search.views[viewId].editingGame) ? state.search.views[viewId].editingGame[key] : undefined
  ],
  (isEditing, selectedGameValue, editingGameValue) => (isEditing ? editingGameValue : selectedGameValue) as Game[K]
);

export function GameComponentAlternateTitles(props: GameComponentProps) {
  const { viewId, updateGame } = props;
  const alternateTitles = window.ext.hooks.useAppSelector(selectGameField(viewId, 'alternateTitles'));
  const lang = useContext(LangContext);

  return <GameComponentInputField
    header={lang.browse.alternateTitles}
    text={alternateTitles}
    placeholder={lang.browse.noAlternateTitles}
    onChange={(value) => updateGame({ alternateTitles: value })}
    {...props} />;
}

export function GameComponentSeries(props: GameComponentProps) {
  const { viewId, editable, updateGame, doSearch } = props;
  const series = window.ext.hooks.useAppSelector(selectGameField(viewId, 'series'));
  const lang = useContext(LangContext);

  return <GameComponentInputField
    header={lang.browse.series}
    text={series}
    placeholder={lang.browse.noSeries}
    onClick={() => { if (!editable) { doSearch(`series=${series}`); }}}
    onChange={(value) => updateGame({ series: value })}
    {...props} />;
}

export function GameComponentPublisher(props: GameComponentProps) {
  const { viewId, editable, updateGame, doSearch } = props;
  const publisher = window.ext.hooks.useAppSelector(selectGameField(viewId, 'publisher'));
  const lang = useContext(LangContext);

  return <GameComponentInputField
    header={lang.browse.publisher}
    text={publisher}
    placeholder={lang.browse.noPublisher}
    onClick={() => { if (!editable) { doSearch(`publisher=${publisher}`); }}}
    onChange={(value) => updateGame({ publisher: value })}
    {...props} />;
}

export function GameComponentSource(props: GameComponentProps) {
  const { viewId, updateGame } = props;
  const source = window.ext.hooks.useAppSelector(selectGameField(viewId, 'source'));
  const lang = useContext(LangContext);

  return <GameComponentInputField
    header={lang.browse.source}
    text={source}
    placeholder={lang.browse.noSource}
    onChange={(value) => updateGame({ source: value })}
    {...props} />;
}

export function GameComponentVersion(props: GameComponentProps) {
  const { viewId, updateGame } = props;
  const version = window.ext.hooks.useAppSelector(selectGameField(viewId, 'version'));
  const lang = useContext(LangContext);

  return <GameComponentInputField
    header={lang.browse.version}
    text={version}
    placeholder={lang.browse.noVersion}
    onChange={(value) => updateGame({ version: value })}
    {...props} />;
}

export function GameComponentLanguage(props: GameComponentProps) {
  const { viewId, editable, updateGame, doSearch } = props;
  const language = window.ext.hooks.useAppSelector(selectGameField(viewId, 'language'));
  const lang = useContext(LangContext);

  return <GameComponentInputField
    header={lang.browse.language}
    text={language}
    placeholder={lang.browse.noLanguage}
    onClick={() => { if (!editable) { doSearch(`language=${language}`); }}}
    onChange={(value) => updateGame({ language: value })}
    {...props} />;
}

export function GameComponentPlayMode(props: GameComponentProps) {
  const { viewId, editable, suggestions, updateGame, doSearch } = props;
  const playMode = window.ext.hooks.useAppSelector(selectGameField(viewId, 'playMode'));
  const lang = useContext(LangContext);

  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.playMode}: </p>
      <DropdownInputField
        text={playMode}
        placeholder={lang.browse.noPlayMode}
        onChange={(event) => updateGame({ playMode: event.currentTarget.value })}
        className='browse-right-sidebar__searchable'
        editable={editable}
        onClick={() => { if (!editable) { doSearch(`playMode=${playMode}`); }}}
        items={suggestions && filterSuggestions(suggestions.playMode) || []}
        onItemSelect={text => updateGame({ playMode: text })} />
    </div>
  );
}

export function GameComponentStatus(props: GameComponentProps) {
  const { viewId, editable, suggestions, updateGame, doSearch } = props;
  const status = window.ext.hooks.useAppSelector(selectGameField(viewId, 'playMode'));
  const lang = useContext(LangContext);

  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.status}: </p>
      <DropdownInputField
        text={status}
        placeholder={lang.browse.noStatus}
        onChange={(event) => updateGame({ status: event.currentTarget.value })}
        className='browse-right-sidebar__searchable'
        editable={editable}
        onClick={() => { if (!editable) { doSearch(`status=${status}`); }}}
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
  const { viewId, editable, updateGame } = props;
  const dateAdded = window.ext.hooks.useAppSelector(selectGameField(viewId, 'dateAdded'));
  const dateModified = window.ext.hooks.useAppSelector(selectGameField(viewId, 'dateModified'));
  const releaseDate = window.ext.hooks.useAppSelector(selectGameField(viewId, 'releaseDate'));
  const lang = useContext(LangContext);

  if (editable) {
    return (
      <GameComponentInputField
        header={lang.browse.releaseDate}
        text={releaseDate}
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
                {formatSidebarDate(dateAdded)}
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
                {formatSidebarDate(dateModified)}
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
              <div className={`browse-right-sidebar__stats-cell ${releaseDate ? '' : 'browse-right-sidebar__stats-cell-placeholder simple-disabled-text'}`}>
                {releaseDate ? formatSidebarDate(releaseDate) : lang.browse.noneFound}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export function GameComponentOriginalDescription(props: GameComponentProps) {
  const { viewId, updateGame } = props;
  const originalDescription = window.ext.hooks.useAppSelector(selectGameField(viewId, 'originalDescription'));
  const lang = useContext(LangContext);

  return (
    <GameComponentInputField
      header={lang.browse.originalDescription}
      text={originalDescription}
      placeholder={lang.browse.noOriginalDescription}
      multiline={true}
      onChange={(value) => updateGame({ originalDescription: value })}
      {...props} />
  );
}

export function GameComponentLegacyData(props: GameComponentProps) {
  const { viewId, editable, suggestions, updateGame } = props;
  const legacyApplicationPath = window.ext.hooks.useAppSelector(selectGameField(viewId, 'legacyApplicationPath'));
  const legacyLaunchCommand = window.ext.hooks.useAppSelector(selectGameField(viewId, 'legacyLaunchCommand'));
  const activeDataId = window.ext.hooks.useAppSelector(selectGameField(viewId, 'activeDataId'));
  const lang = useContext(LangContext);

  if (!activeDataId) {
    return (
      <div className='browse-right-sidebar__section'>
        <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
          <p>{lang.browse.applicationPath}: </p>
          <DropdownInputField
            text={legacyApplicationPath}
            placeholder={lang.browse.noApplicationPath}
            onChange={(event) => updateGame({ legacyApplicationPath: event.currentTarget.value })}
            editable={editable}
            items={suggestions && filterSuggestions(suggestions.applicationPath) || []}
            onItemSelect={text => updateGame({ legacyApplicationPath: text })} />
        </div>
        <GameComponentInputField
          header={lang.browse.launchCommand}
          text={legacyLaunchCommand}
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
  const { viewId, gameId, editable, updateGame, launchAddApp } = props;
  const addApps = window.ext.hooks.useAppSelector(selectGameField(viewId, 'addApps'));
  const lang = useContext(LangContext);

  const onNewAddAppClick = () => {
    const newAddApp = ModelUtils.createAddApp(gameId);
    newAddApp.id = uuid();
    const existingAddApps = addApps || [];
    updateGame({ addApps: [...existingAddApps, ...[newAddApp]] });
  };

  const onEditAddApp = (addApp: AdditionalApp) => {
    if (addApps !== undefined) {
      const newAddApps = deepCopy(addApps);
      const addAppIdx = newAddApps.findIndex(addApp => addApp.id === addApp.id);
      if (addAppIdx > -1) {
        newAddApps[addAppIdx] = addApp;
        updateGame({ addApps: newAddApps });
      }
    }
  };

  const onAddAppDelete = (addAppId: string): void => {
    if (addApps !== undefined) {
      const newAddApps = deepCopy(addApps);
      const index = newAddApps.findIndex(addApp => addApp.id === addAppId);
      if (index === -1) { throw new Error('Cant remove additional application because it was not found.'); }
      newAddApps.splice(index, 1);
      updateGame({ addApps: newAddApps });
    }
  };

  if (editable || (addApps && addApps.length > 0)) {
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
        {addApps && addApps.map((addApp) => (
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
  const { playlistGame, updatePlaylistNotes } = props;
  const upperEditable = props.editable;
  const lang = useContext(LangContext);
  const [editableOverride, setEditableOverride] = useState(false);
  const editable = editableOverride || upperEditable;
  console.log(upperEditable);

  const HeaderComponent = (props: GameComponentInputFieldProps) => {
    return (
      <>
        <p className='browse-right-sidebar__row-header-text'>{props.header}: </p>
        {!upperEditable && (
          <>
            <div onClick={() => setEditableOverride(!editableOverride)}>
              <OpenIcon icon={editable ? 'check' : 'pencil'}/>
            </div>
          </>
        )}
      </>
    );
  };

  if (playlistGame) {
    return (
      <GameComponentInputField
        header={lang.browse.playlistNotes}
        text={playlistGame.notes}
        placeholder={lang.browse.noPlaylistNotes}
        multiline={true}
        onChange={(value) => updatePlaylistNotes(value)}
        {...props}
        editable={editable}
        HeaderComponent={HeaderComponent} />
    );
  } else {
    return (<></>);
  }
}

export function GameComponentNotes(props: GameComponentProps) {
  const { viewId, updateGame } = props;
  const notes = window.ext.hooks.useAppSelector(selectGameField(viewId, 'notes'));
  const lang = useContext(LangContext);

  return (
    <GameComponentInputField
      header={lang.browse.notes}
      text={notes}
      placeholder={lang.browse.noNotes}
      multiline={true}
      onChange={(value) => updateGame({ notes: value })}
      {...props} />
  );
}

export function GameComponentRuffleSupport(props: GameComponentProps) {
  const { viewId, editable, updateGame, doSearch } = props;
  const ruffleSupport = window.ext.hooks.useAppSelector(selectGameField(viewId, 'ruffleSupport'));
  const lang = useContext(LangContext);

  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{lang.browse.ruffleSupport}: </p>
      <DropdownInputFieldMapped
        text={mapRuffleSupportString(ruffleSupport)}
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
        onClick={() => { if (!editable) { doSearch(`ruffle=${ruffleSupport}`); }}}
        onChange={(key) => {
          updateGame({ ruffleSupport: key });
        }} />
      {!editable && ruffleSupport !== '' ? (
        <div className='browse-right-sidebar-floating-icon'>
          <OpenIcon icon='check' />
        </div>
      ) : undefined}
    </div>
  );
}

export function GameComponentTags(props: GameComponentProps) {
  const { viewId, editable, fpfssEditMode, updateGame, doSearch } = props;
  const detailedTags = window.ext.hooks.useAppSelector(selectGameField(viewId, 'detailedTags'));
  const tags = window.ext.hooks.useAppSelector(selectGameField(viewId, 'tags'));
  const lang = useContext(LangContext);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const tagFilters = window.ext.hooks.useAppSelector(state => state.preferences.tagFilters);
  const browsePageShowExtreme = window.ext.hooks.useAppSelector(state => state.preferences.browsePageShowExtreme);
  const tagCategories = window.ext.hooks.useAppSelector(state => state.tagCategories);

  const onCurrentTagChange = (event: React.ChangeEvent<InputElement>) => {
    const newTag = event.currentTarget.value;
    let newSuggestions: TagSuggestion[] = tagSuggestions;

    if (newTag !== '') {
      // Delayed set
      window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, newTag, tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !browsePageShowExtreme)).concat([generateTagFilterGroup(tags)]))
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
    const newDetailedTags = deepCopy(!detailedTags ? [] : detailedTags);
    const newTags = deepCopy(tags);
    const tagsIndex = newTags.findIndex(t => t.toLowerCase() === tag.name.toLowerCase());
    if (tagsIndex > -1) {
      newTags.splice(tagsIndex, 1);
    }
    const detailedTagsIndex = newDetailedTags.findIndex(t => t.name.toLowerCase() === tag.name.toLowerCase());
    if (detailedTagsIndex > -1) {
      newDetailedTags.splice(detailedTagsIndex, 1);
    }
    updateGame({ tags: newTags, detailedTags: newDetailedTags });
  };

  const onAddTagSuggestion = (suggestion: TagSuggestion) => {
    window.Shared.back.request(BackIn.GET_TAG_BY_ID, suggestion.id)
    .then((tag) => {
      if (tag) {
        // Ignore dupe tags
        if (!tags.map(t => t.toLowerCase()).includes(tag.name.toLowerCase())) {
          const newDetailedTags = detailedTags ? detailedTags : [];
          updateGame({ tags: [...tags, tag.name], detailedTags: [...newDetailedTags, tag] });
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
        if (!tags.map(t => t.toLowerCase()).includes(newTagText.toLowerCase())) {

          const tag: Tag = {
            id: -1,
            name: newTagText,
            aliases: [newTagText],
            description: '',
            dateModified: (new Date()).toISOString(),
            category: 'default'
          };
          updateGame({ tags: [...tags, tag.name], detailedTags: [...(!detailedTags ? [] : detailedTags), tag] });
        }
      } else {
        window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, text)
        .then((tag) => {
          if (tag) {
            // Ignore dupe tags
            if (!tags.map(t => t.toLowerCase()).includes(tag.name.toLowerCase())) {
              const newDetailedTags = detailedTags ? detailedTags : [];
              updateGame({ tags: [...tags, tag.name], detailedTags: [...newDetailedTags, tag] });
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
        tags={detailedTags || []}
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
  const { viewId, editable, fpfssEditMode, updateGame, doSearch } = props;
  const platforms = window.ext.hooks.useAppSelector(selectGameField(viewId, 'platforms'));
  const detailedPlatforms = window.ext.hooks.useAppSelector(selectGameField(viewId, 'detailedPlatforms'));
  const primaryPlatform = window.ext.hooks.useAppSelector(selectGameField(viewId, 'primaryPlatform'));
  const lang = useContext(LangContext);
  const logoVersion = window.ext.hooks.useAppSelector(state => state.main.logoVersion);
  const tagCategories = window.ext.hooks.useAppSelector(state => state.tagCategories);

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
    const newDetailedPlatforms = deepCopy(!detailedPlatforms ? [] : detailedPlatforms);
    const newPlatforms = deepCopy(platforms);
    const platIndex = newPlatforms.findIndex(p => p.toLowerCase() === newDetailedPlatforms[index].name.toLowerCase());
    newPlatforms.splice(platIndex, 1);
    newDetailedPlatforms.splice(index, 1);
    updateGame({ platforms: newPlatforms, detailedPlatforms: newDetailedPlatforms });
  };

  const onAddPlatformSuggestion = (suggestion: TagSuggestion) => {
    window.Shared.back.request(BackIn.GET_PLATFORM_BY_ID, suggestion.id)
    .then((platform) => {
      if (platform) {
        // Ignore dupe tags
        if (!platforms.map(t => t.toLowerCase()).includes(platform.name.toLowerCase())) {
          const newDetailedPlatforms = detailedPlatforms ? detailedPlatforms : [];
          const primary = platforms.length === 0 ? platform.name : primaryPlatform;
          updateGame({ platforms: [...platforms, platform.name], primaryPlatform: primary, detailedPlatforms: [...newDetailedPlatforms, platform] });
        }
      }
    });

    // Clear out suggestions box and current search
    setCurrentPlatformInput('');
    setPlatformSuggestions([]);
  };

  const promotePlatform = (value: string) => {
    if (platforms.includes(value)) {
      updateGame({ primaryPlatform: value });
    }
  };

  const onAddPlatformByString = (text: string) => {
    if (text !== '') {
      if (fpfssEditMode) {
        const newPlatformText = text.trim();
        if (!platforms.map(t => t.toLowerCase()).includes(newPlatformText.toLowerCase())) {
          const platform: Platform = {
            id: -1,
            name: newPlatformText,
            aliases: [newPlatformText],
            description: '',
            dateModified: (new Date()).toISOString()
          };
          const primary = platforms.length === 0 ? platform.name : primaryPlatform;
          updateGame({ platforms: [...platforms, platform.name], primaryPlatform: primary, detailedPlatforms: [...(!detailedPlatforms ? [] : detailedPlatforms), platform] });
        }
      } else {
        window.Shared.back.request(BackIn.GET_OR_CREATE_PLATFORM, text)
        .then((platform) => {
          if (platform) {
            // Ignore dupe platforms
            if (!platforms.map(t => t.toLowerCase()).includes(platform.name.toLowerCase())) {
              const newDetailedPlatforms = detailedPlatforms ? detailedPlatforms : [];
              const primary = platforms.length === 0 ? platform.name : primaryPlatform;
              updateGame({ platforms: [...platforms, platform.name], primaryPlatform: primary, detailedPlatforms: [...newDetailedPlatforms, platform] });
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
            tags={detailedPlatforms?.filter(p => p.name == primaryPlatform) || []}
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
          tags={editable ? detailedPlatforms || [] : detailedPlatforms?.filter(p => p.name !== primaryPlatform) || []}
          suggestions={platformSuggestions}
          categories={tagCategories}
          onTagEditableSelect={onRemovePlatform}
          onTagSuggestionSelect={onAddPlatformSuggestion}
          onTagSubmit={onAddPlatformByString}
          renderIcon={renderPlatformIcon}
          renderIconSugg={renderPlatformIconSugg}
          primaryValue={primaryPlatform}
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
