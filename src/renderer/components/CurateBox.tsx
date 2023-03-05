import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import * as remote from '@electron/remote';
import {
  CurateBoxDropdownInputRow,
  CurateBoxInputEntryRow,
  CurateBoxInputRow,
  CurateBoxTagDropdownInputRow,
  DropdownItem
} from '@renderer/components/CurateBoxInputRow';
import { GameImageSplit } from '@renderer/components/GameImageSplit';
import { CurateActionType } from '@renderer/store/curate/enums';
import { AddAppType, CurateAction } from '@renderer/store/curate/types';
import { getCurationURL, getPlatformIconURL } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { BackIn, CurationImageEnum } from '@shared/back/types';
import { CURATIONS_FOLDER_WORKING } from '@shared/constants';
import { ContentTreeNode } from '@shared/curate/types';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { fixSlashes, sizeToString } from '@shared/Util';
import axios from 'axios';
import { clipboard, MenuItemConstructorOptions } from 'electron';
import { CurationState, LoadedCuration, Platform, TagSuggestion } from 'flashpoint-launcher';
import * as path from 'path';
import * as React from 'react';
import { Dispatch } from 'redux';
import { BoxList } from './BoxList';
import { CurateBoxAddApp } from './CurateBoxAddApp';
import { CurateBoxRow } from './CurateBoxRow';
import { CurateBoxWarnings } from './CurateBoxWarnings';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

export type CurateBoxProps = {
  curation: CurationState;
  suggestions: Partial<GamePropSuggestions>;
  tagSuggestions: TagSuggestion<Tag>[];
  platformSuggestions: TagSuggestion<Platform>[];
  tagCategories: TagCategory[];
  tagText: string;
  platformText: string;
  onTagTextChange: (tagText: string) => void;
  onPlatformTextChange: (platformText: string) => void;
  dispatch: Dispatch<CurateAction>;
  symlinkCurationContent: boolean;
  logoVersion: number;
}

export function CurateBox(props: CurateBoxProps) {
  const strings = React.useContext(LangContext);
  const disabled = !!props.curation.locked;

  const splitStatus = React.useMemo(() => props.curation.game.status ? props.curation.game.status.split(';').map(s => s.trim()).sort() : [], [props.curation.game.status]);
  const splitPlayMode = React.useMemo(() => props.curation.game.playMode ? props.curation.game.playMode.split(';').map(s => s.trim()).sort() : [], [props.curation.game.playMode]);

  const sortedTags = React.useMemo(() => {
    const tags = props.curation.game.tags;
    if (tags) {
      return tags.sort((a, b) => {
        // Sort by category, then name secondarily
        if (a.categoryId !== b.categoryId) {
          const categoryA: TagCategory | undefined = props.tagCategories.find(c => c.id === a.categoryId);
          const categoryB: TagCategory | undefined = props.tagCategories.find(c => c.id === b.categoryId);
          if (!categoryA && !categoryB) {
            return a.primaryAlias.name.toLowerCase().localeCompare(b.primaryAlias.name);
          } else if (!categoryA) {
            return -1;
          } else if (!categoryB) {
            return 1;
          } else {
            return categoryA.name.toLowerCase().localeCompare(categoryB.name.toLowerCase());
          }
        } else {
          return a.primaryAlias.name.toLowerCase().localeCompare(b.primaryAlias.name);
        }
      });
    } else {
      return [];
    }
  }, [props.curation.game.tags]);

  const onSetThumbnail  = useAddImageCallback(CurationImageEnum.THUMBNAIL, props.curation);
  const onSetScreenshot = useAddImageCallback(CurationImageEnum.SCREENSHOT,   props.curation);
  const onRemoveThumbnailClick  = useRemoveImageCallback(CurationImageEnum.THUMBNAIL, props.curation, props.dispatch);
  const onRemoveScreenshotClick = useRemoveImageCallback(CurationImageEnum.SCREENSHOT,  props.curation, props.dispatch);
  const onDropThumbnail  = useDropImageCallback('logo.png', props.curation, strings.dialog);
  const onDropScreenshot = useDropImageCallback('ss.png',   props.curation, strings.dialog);

  const thumbnailPath  = props.curation.thumbnail.exists  ? fixSlashes(`${props.curation.thumbnail.filePath }?v=${props.curation.thumbnail.version }`) : undefined;
  const screenshotPath = props.curation.screenshot.exists ? fixSlashes(`${props.curation.screenshot.filePath}?v=${props.curation.screenshot.version}`) : undefined;

  const onNewAddApp  = useCreateAddAppCallback('normal',  props.curation.folder, props.dispatch);
  const onAddExtras  = useCreateAddAppCallback('extras',  props.curation.folder, props.dispatch);
  const onAddMessage = useCreateAddAppCallback('message', props.curation.folder, props.dispatch);

  const onAddStatus = React.useCallback((value: string) => {
    const newSplits = [ ...splitStatus ];
    newSplits.push(value);
    props.dispatch({
      type: CurateActionType.EDIT_CURATION_META,
      folder: props.curation.folder,
      property: 'status',
      value: Array.from(new Set(newSplits.sort())).join('; ')
    });
  }, [props.curation.folder, splitStatus, props.dispatch]);

  const onRemoveStatus = React.useCallback((index: number) => {
    const newSplits = [ ...splitStatus ];
    newSplits.splice(index, 1);
    const newStatus = newSplits.join('; ');
    props.dispatch({
      type: CurateActionType.EDIT_CURATION_META,
      folder: props.curation.folder,
      property: 'status',
      value: newStatus
    });
  }, [props.curation.folder, props.curation.game.status, splitStatus, props.dispatch]);

  const onAddPlayMode = React.useCallback((value: string) => {
    const newSplits = [ ...splitPlayMode ];
    newSplits.push(value);
    props.dispatch({
      type: CurateActionType.EDIT_CURATION_META,
      folder: props.curation.folder,
      property: 'playMode',
      value: Array.from(new Set(newSplits.sort())).join('; ')
    });
  }, [props.curation.folder, props.curation.game.playMode, splitPlayMode, props.dispatch]);

  const onRemovePlayMode = React.useCallback((index: number) => {
    const newSplits = [ ...splitPlayMode ];
    newSplits.splice(index, 1);
    const newPlayMode = newSplits.join('; ');
    props.dispatch({
      type: CurateActionType.EDIT_CURATION_META,
      folder: props.curation.folder,
      property: 'playMode',
      value: newPlayMode
    });
  }, [props.curation.folder, props.curation.game.playMode, splitPlayMode, props.dispatch]);

  const onTagChange = React.useCallback((event: React.ChangeEvent<InputElement>): void => {
    props.onTagTextChange(event.currentTarget.value);
  }, [props.onTagTextChange]);

  const onPlatformChange = React.useCallback((event: React.ChangeEvent<InputElement>): void => {
    props.onPlatformTextChange(event.currentTarget.value);
  }, [props.onPlatformTextChange]);

  const onTagKeyDown = React.useCallback((event: React.KeyboardEvent<InputElement>): void => {
    console.log(event.key);
    if (event.defaultPrevented) { return; }

    if (event.key === 'Enter') {
      if (props.suggestions.tags) {
        const index = props.suggestions.tags.findIndex(tag => tag === event.currentTarget.value);
        if (index !== -1) {
          console.log(index, props.suggestions.tags[index]);
        }
      }
    }
  }, []);

  const onPlatformKeyDown = React.useCallback((event: React.KeyboardEvent<InputElement>): void => {
    console.log(event.key);
    if (event.defaultPrevented) { return; }

    if (event.key === 'Enter') {
      if (props.suggestions.platforms) {
        const index = props.suggestions.platforms.findIndex(p => p === event.currentTarget.value);
        if (index !== -1) {
          console.log(index, props.suggestions.platforms[index]);
        }
      }
    }
  }, []);

  const onAddTag = React.useCallback((tag: Tag) => {
    const tags = props.curation.game.tags || [];
    if (!tags.find(t => t.id === tag.id)) {
      props.dispatch({
        type: CurateActionType.ADD_TAG,
        folder: props.curation.folder,
        tag: tag
      });
    }
    props.onTagTextChange('');
  }, [props.curation.folder]);

  const onAddPlatform = React.useCallback((platform: Platform) => {
    const platforms = props.curation.game.platforms || [];
    if (!platforms.find(p => p.id === platform.id)) {
      props.dispatch({
        type: CurateActionType.ADD_PLATFORM,
        folder: props.curation.folder,
        platform
      });
    }
    props.onPlatformTextChange('');
  }, [props.curation.folder]);

  const onRemoveTag = React.useCallback((tagId: number) => {
    props.dispatch({
      type: CurateActionType.REMOVE_TAG,
      folder: props.curation.folder,
      tagId,
    });
  }, [props.curation.folder]);

  const onRemovePlatform = React.useCallback((platformId) => {
    props.dispatch({
      type: CurateActionType.REMOVE_PLATFORM,
      folder: props.curation.folder,
      platformId
    });
  }, [props.curation.folder]);

  const toggleContentNodeView = React.useCallback((tree: string[]) => {
    props.dispatch({
      type: CurateActionType.TOGGLE_CONTENT_NODE_VIEW,
      folder: props.curation.folder,
      tree
    });
  }, [props.curation.folder, props.curation.contents]);

  const onContentTreeNodeMenuFactory = (node: ContentTreeNode, tree: string[]) => () => {
    const contextButtons: MenuItemConstructorOptions[] = [{
      label: strings.curate.contextCopyName,
      click: () => clipboard.writeText(node.name)
    }, {
      label: strings.curate.contextCopyPath,
      click: () => clipboard.writeText(tree.join(path.sep))
    }, {
      label: strings.curate.contextCopyAsURL,
      click: () => clipboard.writeText(`"http://${tree.join('/')}"`)
    }, {
      type: 'separator'
    }];
    if (node.type === 'file') {
      contextButtons.push({
        label: strings.curate.contextShowInExplorer,
        click: () => remote.shell.showItemInFolder(path.join(window.Shared.config.fullFlashpointPath, CURATIONS_FOLDER_WORKING, props.curation.folder, 'content', tree.join(path.sep)))
      });
    } else if (node.type === 'directory') {
      contextButtons.push({
        label: strings.curate.contextOpenFolderInExplorer,
        click: () => remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, CURATIONS_FOLDER_WORKING, props.curation.folder, 'content', tree.join(path.sep)))
      });
    }
    const menu = remote.Menu.buildFromTemplate(contextButtons);
    menu.popup({ window: remote.getCurrentWindow() });
    return menu;
  };

  function renderContentNode(depth: number, node: ContentTreeNode, key: number, tree: string[] = [], launchPath?: string): JSX.Element | JSX.Element[] {
    const filePath = tree.join('/');
    const isLaunchPath = filePath === launchPath;
    const depthDivs = [];
    for (let i = 0; i < depth; i++) {
      depthDivs.push(<div className='curate-box-content__depth' key={`${i}`} style={{ width: '1rem' }}/>);
    }
    switch (node.type) {
      case 'directory': {
        const children = node.expanded ? node.children.map((node, index) => renderContentNode(depth + 1, node, index, tree.concat([node.name]), launchPath))
        .reduce<JSX.Element[]>((prev, next) => Array.isArray(next) ? prev.concat(next) : [...prev, next], []) : [];
        return [
          (
            <div
              key={`${tree.join('_')}_${key}`}
              onContextMenu={onContentTreeNodeMenuFactory(node, tree)}
              className='curate-box-content__entry'>
              { depth > 0 && (
                depthDivs
              )}
              <div className='curate-box-content__entry-icon curate-box-content__entry-icon--collapse'
                onClick={() => toggleContentNodeView(tree)} >
                <OpenIcon className={isLaunchPath ? 'curate-box-content__entry-icon--launch-path' : ''} icon={node.expanded ? 'chevron-bottom': 'chevron-right' }/>
              </div>
              <div>{node.name}</div>
            </div>
          ),
          ...children
        ];
      }
      case 'file':
        return (
          <div
            key={`${tree.join('_')}_${key}`}
            onContextMenu={onContentTreeNodeMenuFactory(node, tree)}
            className='curate-box-content__entry'>
            { depth > 0 && (
              depthDivs
            )}
            <OpenIcon className={`curate-box-content__entry-icon ${isLaunchPath ? 'curate-box-content__entry-icon--launch-path' : ''}`} icon='file'/>
            <div>{node.name} ({sizeToString(node.size || 0)})</div>
          </div>
        );
    }
  }

  const renderContentTree = React.useMemo(() => {
    // Extract first string from launch command via regex
    let launchPath: string | undefined = undefined;
    if (props.curation.game.launchCommand) {
      const match = props.curation.game.launchCommand.match(/[^\s"']+|"([^"]*)"|'([^']*)'/);
      if (match) {
        // Match 1 - Inside quotes, Match 0 - No Quotes Found
        let lc = match[1] || match[0];
        const protocol = lc.match(/(.+?):\/\//);
        if (protocol) {
          lc = lc.substring(protocol[0].length);
        }
        const ending = lc.split('/').pop();
        // If the string ends in file, cut off parameters
        if (ending && ending.includes('.')) {
          lc = lc.split('?')[0];
        }
        if (lc.endsWith('/')) {
          lc = lc.substring(0, lc.length - 1);
        }
        launchPath = lc;
      }
    }
    const render = props.curation.contents ?
      props.curation.contents.root.count <= 4000 ? (
        props.curation.contents.root.children.map((node, index) => {
          return renderContentNode(0, node, index, [node.name], launchPath);
        })
      ) : (
        <p>{`Too large to render (4000 files max) - ${props.curation.contents.root.count} files in content folder.`}</p>
      )
      : (
        <p>{strings.misc.loading}</p>
      );
    return (
      <div className='curate-box-content simple-scroll'>
        {render}
      </div>
    );
  }, [props.curation.contents, props.curation.game.launchCommand]);

  const renderTagIcon = React.useCallback((tag: Tag) => {
    const category = props.tagCategories.find(c => c.id === tag.categoryId);
    return (
      <OpenIcon
        className='curate-tag__icon'
        color={category ? category.color : '#FFFFFF'}
        icon='tag'/>
    );
  }, []);

  const renderPlatformIconSugg = React.useCallback((platformSugg: TagSuggestion<Platform>) => {
    const iconUrl = getPlatformIconURL(platformSugg.primaryAlias, props.logoVersion);
    return (
      <div
        className='curate-tag__icon'
        style={{ backgroundImage: `url(${iconUrl})` }} />
    );
  }, []);

  const renderPlatformIcon = React.useCallback((platform: Platform) => {
    const iconUrl = getPlatformIconURL(platform.primaryAlias.name, props.logoVersion);
    return (
      <div
        className='curate-tag__icon'
        style={{ backgroundImage: `url(${iconUrl})` }} />
    );
  }, []);

  const addAppBoxes = (
    <table className="curate-box-table">
      <tbody>
        { props.curation.addApps.map((addApp, idx) => (
          <CurateBoxAddApp
            key={idx}
            disabled={disabled}
            folder={props.curation.folder}
            addApp={addApp}
            dispatch={props.dispatch}
            symlinkCurationContent={props.symlinkCurationContent} />
        ))}
      </tbody>
    </table>
  );

  const shared = {
    curationFolder: props.curation.folder,
    disabled: disabled,
    dispatch: props.dispatch,
  } as const;

  return (
    <div className='curate-box'>
      <div className='simple-columns curate-box__columns'>
        {/* Left/Top */}
        <div className='simple-columns__column'>
          {/* Images */}
          <div className='curate-box__images'>
            <GameImageSplit
              text={strings.browse.thumbnail}
              imgSrc={thumbnailPath}
              showHeaders={false}
              onSetImage={onSetThumbnail}
              onRemoveClick={onRemoveThumbnailClick}
              disabled={disabled}
              onDrop={onDropThumbnail} />
            <GameImageSplit
              text={strings.browse.screenshot}
              imgSrc={screenshotPath}
              showHeaders={false}
              onSetImage={onSetScreenshot}
              onRemoveClick={onRemoveScreenshotClick}
              disabled={disabled}
              onDrop={onDropScreenshot} />
          </div>
          {/* Meta */}
          <table className='curate-box-table'>
            <tbody>
              <CurateBoxInputRow
                title={strings.filter.title}
                text={props.curation.game.title}
                placeholder={strings.browse.noTitle}
                warned={props.curation.warnings.fieldWarnings.includes('title')}
                property='title'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.alternateTitles}
                text={props.curation.game.alternateTitles}
                placeholder={strings.browse.noAlternateTitles}
                warned={props.curation.warnings.fieldWarnings.includes('alternateTitles')}
                property='alternateTitles'
                { ...shared } />
              {/* @TODO Replace this with a Dropdown menu that does NOT allow selection of the text or typing into it. */}
              <CurateBoxDropdownInputRow
                title={strings.browse.library}
                text={props.curation.game.library ? strings.libraries[props.curation.game.library] || props.curation.game.library : ''}
                items={createDropdownItems(props.suggestions.library || [], strings.libraries)}
                warned={props.curation.warnings.fieldWarnings.includes('library')}
                property='library'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.series}
                text={props.curation.game.series}
                placeholder={strings.browse.noSeries}
                warned={props.curation.warnings.fieldWarnings.includes('series')}
                property='series'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.developer}
                text={props.curation.game.developer}
                placeholder={strings.browse.noDeveloper}
                warned={props.curation.warnings.fieldWarnings.includes('developer')}
                property='developer'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.publisher}
                text={props.curation.game.publisher}
                placeholder={strings.browse.noPublisher}
                warned={props.curation.warnings.fieldWarnings.includes('publisher')}
                property='publisher'
                { ...shared } />
              {/* Tags */}
              <CurateBoxTagDropdownInputRow
                title={strings.browse.tags}
                tagCategories={props.tagCategories}
                text={props.tagText}
                tagSuggestions={props.tagSuggestions}
                getTagFromName={getTagFromName}
                onAddTag={onAddTag}
                onChange={onTagChange}
                onKeyDown={onTagKeyDown}
                warned={props.curation.warnings.fieldWarnings.includes('tags')}
                property='tags'
                { ...shared } />
              <BoxList
                items={sortedTags}
                getIndexAttr={(tag) => {
                  return tag.id || 0;
                }}
                getItemValue={(tag) => {
                  return tag.primaryAlias.name;
                }}
                renderIcon={renderTagIcon}
                onRemove={onRemoveTag}
              />
              <CurateBoxInputEntryRow
                title={strings.browse.playMode}
                placeholder={strings.browse.noPlayMode}
                onEnter={onAddPlayMode}
                warned={props.curation.warnings.fieldWarnings.includes('playMode')}
                suggestions={props.suggestions.playMode}
                { ...shared } />
              {/** Play Mode List */}
              {splitPlayMode.length > 0 && (
                <BoxList
                  items={splitPlayMode}
                  getItemValue={(item) => item}
                  getIndexAttr={(item) => splitPlayMode.findIndex(i => i === item)}
                  onRemove={onRemovePlayMode} />
              )}
              <CurateBoxInputEntryRow
                title={strings.browse.status}
                placeholder={strings.browse.noStatus}
                onEnter={onAddStatus}
                warned={props.curation.warnings.fieldWarnings.includes('status')}
                suggestions={props.suggestions.status}
                { ...shared } />
              {/** Status List */}
              {splitStatus.length > 0 && (
                <BoxList
                  items={splitStatus}
                  getItemValue={(item) => item}
                  getIndexAttr={(item) => splitStatus.findIndex(i => i === item)}
                  onRemove={onRemoveStatus} />
              )}
              <CurateBoxInputRow
                title={strings.browse.version}
                text={props.curation.game.version}
                placeholder={strings.browse.noVersion}
                warned={props.curation.warnings.fieldWarnings.includes('version')}
                property='version'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.releaseDate}
                text={props.curation.game.releaseDate}
                placeholder={strings.browse.noReleaseDate}
                warned={props.curation.warnings.fieldWarnings.includes('releaseDate')}
                property='releaseDate'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.language}
                text={props.curation.game.language}
                placeholder={strings.browse.noLanguage}
                warned={props.curation.warnings.fieldWarnings.includes('language')}
                property='language'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.source}
                text={props.curation.game.source}
                placeholder={strings.browse.noSource}
                warned={props.curation.warnings.fieldWarnings.includes('source')}
                property='source'
                { ...shared } />
              {/* Platform */}
              <CurateBoxTagDropdownInputRow
                title={strings.config.platforms}
                tagCategories={[]}
                text={props.platformText}
                tagSuggestions={props.platformSuggestions}
                getTagFromName={getPlatformFromName}
                onAddTag={onAddPlatform}
                onChange={onPlatformChange}
                onKeyDown={onPlatformKeyDown}
                renderIconSugg={renderPlatformIconSugg}
                warned={props.curation.warnings.fieldWarnings.includes('platforms')}
                property='platforms'
                { ...shared } />
              <BoxList
                items={props.curation.game.platforms || []}
                getIndexAttr={(platform) => {
                  return platform.id || 0;
                }}
                getItemValue={(platform) => {
                  return platform.primaryAlias.name;
                }}
                renderIcon={renderPlatformIcon}
                onRemove={onRemovePlatform}
              />
              <CurateBoxDropdownInputRow
                title={strings.browse.applicationPath}
                text={props.curation.game.applicationPath}
                placeholder={strings.browse.noApplicationPath}
                items={createDropdownItems(props.suggestions.applicationPath || [])}
                warned={props.curation.warnings.fieldWarnings.includes('applicationPath')}
                property='applicationPath'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.launchCommand}
                text={props.curation.game.launchCommand}
                placeholder={strings.browse.noLaunchCommand}
                warned={props.curation.warnings.fieldWarnings.includes('launchCommand')}
                property='launchCommand'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.mountParameters}
                text={props.curation.game.mountParameters}
                placeholder={strings.browse.noMountParameters}
                warned={props.curation.warnings.fieldWarnings.includes('mountParameters')}
                property='mountParameters'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.notes}
                text={props.curation.game.notes}
                placeholder={strings.browse.noNotes}
                warned={props.curation.warnings.fieldWarnings.includes('notes')}
                property='notes'
                multiline={true}
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.originalDescription}
                text={props.curation.game.originalDescription}
                placeholder={strings.browse.noOriginalDescription}
                warned={props.curation.warnings.fieldWarnings.includes('originalDescription')}
                property='originalDescription'
                multiline={true}
                { ...shared } />
              <CurateBoxInputRow
                title={strings.curate.curationNotes}
                text={props.curation.game.curationNotes}
                placeholder={strings.curate.noCurationNotes}
                warned={props.curation.warnings.fieldWarnings.includes('curationNotes')}
                property='curationNotes'
                multiline={true}
                { ...shared } />
            </tbody>
          </table>
        </div>
        {/* Right/Bottom */}
        <div className='simple-columns__column'>
          {/* Additional Applications */}
          <div className='curate-box__add-apps'>
            <div className='curate-box__add-apps-top'>
              <p>{strings.browse.additionalApplications}:</p>
              <SimpleButton
                className='curate-box-buttons__button'
                value={strings.curate.newAddApp}
                onClick={onNewAddApp}
                disabled={disabled} />
              <SimpleButton
                className='curate-box-buttons__button'
                value={strings.curate.addExtras}
                onClick={onAddExtras}
                disabled={disabled} />
              <SimpleButton
                className='curate-box-buttons__button'
                value={strings.curate.addMessage}
                onClick={onAddMessage}
                disabled={disabled} />
            </div>
            {addAppBoxes}
          </div>
          <hr />
          {/* Content */}
          <div className='curate-box-files'>
            <div className='curate-box-files__head'>
              {strings.curate.contentFiles + ': '}
            </div>
            <pre className='curate-box-files__body simple-scroll'>
              {renderContentTree}
            </pre>
          </div>
          <hr />
          {/* Warnings */}
          <CurateBoxWarnings warnings={props.curation.warnings} />
          <hr />
          {/* Curation Folder */}
          <table>
            <tbody>
              <CurateBoxRow title={strings.curate.id}>
                <InputField
                  text={props.curation && props.curation.folder || ''}
                  placeholder={'No Folder? Something\'s broken.'}
                  disabled={true} />
              </CurateBoxRow>
              <CurateBoxRow title={'UUID'}>
                <InputField
                  text={props.curation && props.curation.uuid || ''}
                  placeholder={'No ID'}
                  disabled={true} />
              </CurateBoxRow>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function useAddImageCallback(type: CurationImageEnum, curation: LoadedCuration | undefined): (data: ArrayBuffer) => void {
  return React.useCallback(async (data: ArrayBuffer) => {
    if (curation) {
      const suffix = type === CurationImageEnum.THUMBNAIL ? 'logo.png' : 'ss.png';
      const res = await axios.post(`${getCurationURL(curation.folder)}/${suffix}`, data);
      if (res.status !== 200) {
        alert(`ERROR: Server Returned ${res.status} - ${res.statusText}`);
      }
    }
  }, [curation && curation.folder]);
}

/**
 * Delete an image file inside the curation's folder.
 *
 * @param type Enum (Logo or Screenshot)
 * @param curation Curation to delete it from.
 * @param dispatch Curate Action Dispatch Func
 */
function useRemoveImageCallback(type: CurationImageEnum, curation: LoadedCuration | undefined, dispatch: Dispatch<CurateAction>): () => Promise<void> {
  return React.useCallback(async () => {
    if (curation) {
      return window.Shared.back.request(BackIn.CURATE_EDIT_REMOVE_IMAGE, curation.folder, type);
    }
  }, [curation && curation.folder]);
}

function useDropImageCallback(filename: 'logo.png' | 'ss.png', curation: CurationState, strings: LangContainer['dialog']) {
  return React.useCallback(async (event: React.DragEvent) => {
    const files = event.dataTransfer.files;

    if (curation && !curation.locked && files.length > 0) {
      if (files[0].name.toLocaleLowerCase().endsWith('.png')) {
        await axios.post(`${getCurationURL(curation.folder)}/${filename}`, await files[0].arrayBuffer());
      } else {
        alert(strings.mustBePngImage);
      }
    }
  }, [curation && curation.folder, strings]);
}

function useCreateAddAppCallback(type: AddAppType, folder: string, dispatch: Dispatch<CurateAction>) {
  return React.useCallback(() => {
    dispatch({
      type: CurateActionType.NEW_ADDAPP,
      folder: folder,
      addAppType: type,
    });
  }, [dispatch, folder]);
}

function createDropdownItems(values: string[], strings?: LangContainer['libraries']): DropdownItem[] {
  return values.map(v => {
    return {
      key: v,
      value: strings ? strings[v] || v : v
    };
  });
}

async function getTagFromName(name: string) {
  return window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, name.trim());
}

async function getPlatformFromName(name: string) {
  return window.Shared.back.request(BackIn.GET_OR_CREATE_PLATFORM, name.trim());
}
