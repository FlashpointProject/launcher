import { CURATIONS_FOLDER_WORKING } from '@shared/constants';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import * as remote from '@electron/remote';
import {
  CurateBoxDropdownInputRow,
  CurateBoxInputRow,
  CurateBoxTagDropdownInputRow
} from '@renderer/components/CurateBoxInputRow';
import { GameImageSplit } from '@renderer/components/GameImageSplit';
import { useMouse } from '@renderer/hooks/useMouse';
import { CurateActionType } from '@renderer/store/curate/enums';
import { AddAppType, CurateAction } from '@renderer/store/curate/types';
import { findElementAncestor, getCurationURL } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { BackIn, CurationImageEnum } from '@shared/back/types';
import { ContentTreeNode, CurationState, LoadedCuration } from '@shared/curate/types';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { fixSlashes, sizeToString } from '@shared/Util';
import axios from 'axios';
import { clipboard, MenuItemConstructorOptions } from 'electron';
import { TagSuggestion } from 'flashpoint-launcher';
import * as path from 'path';
import * as React from 'react';
import { Dispatch } from 'redux';
import { CurateBoxAddApp } from './CurateBoxAddApp';
import { CurateBoxRow } from './CurateBoxRow';
import { CurateBoxWarnings } from './CurateBoxWarnings';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

const tagIndexAttr = 'data-tag-index';

export type CurateBoxProps = {
  curation: CurationState;
  suggestions: Partial<GamePropSuggestions>;
  tagSuggestions: TagSuggestion[];
  tagCategories: TagCategory[];
  tagText: string;
  onTagTextChange: (tagText: string) => void;
  dispatch: Dispatch<CurateAction>;
  symlinkCurationContent: boolean;
}

export function CurateBox(props: CurateBoxProps) {
  const strings = React.useContext(LangContext);
  const disabled = !!props.curation.locked;

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


  const onTagChange = React.useCallback((event: React.ChangeEvent<InputElement>): void => {
    props.onTagTextChange(event.currentTarget.value);
  }, [props.onTagTextChange]);

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

  const [onTagMouseDown, onTagMouseUp] = useMouse<number>(() => ({
    chain_delay: 500,
    find_id: (event) => {
      let tagId: number | undefined;
      try { tagId = findAncestorRowTagID(event.target as Element); }
      catch (error) { console.error(error); }
      return tagId;
    },
    on_click: (event, tagId, clicks) => {
      if (event.button === 0 && clicks === 1) { // Single left click
        props.dispatch({
          type: CurateActionType.REMOVE_TAG,
          folder: props.curation.folder,
          tagId,
        });
      }
    },
  }));

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
                <div style={{ width: `${depth}rem` }}/>
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
              <div style={{ width: `${depth}rem` }}/>
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
                property='title'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.alternateTitles}
                text={props.curation.game.alternateTitles}
                placeholder={strings.browse.noAlternateTitles}
                property='alternateTitles'
                { ...shared } />
              {/* @TODO Replace this with a Dropdown menu that does NOT allow selection of the text or typing into it. */}
              <CurateBoxDropdownInputRow
                title={strings.browse.library}
                text={props.curation.game.library}
                items={props.suggestions.library}
                property='library'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.series}
                text={props.curation.game.series}
                placeholder={strings.browse.noSeries}
                property='series'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.developer}
                text={props.curation.game.developer}
                placeholder={strings.browse.noDeveloper}
                property='developer'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.publisher}
                text={props.curation.game.publisher}
                placeholder={strings.browse.noPublisher}
                property='publisher'
                { ...shared } />
              <CurateBoxTagDropdownInputRow
                title={strings.browse.tags}
                tagCategories={props.tagCategories}
                text={props.tagText}
                tagSuggestions={props.tagSuggestions}
                onAddTag={onAddTag}
                onChange={onTagChange}
                onKeyDown={onTagKeyDown}
                property='tags'
                { ...shared } />
              {/* Tag List */}
              <tr>
                <td/>
                <td
                  onMouseDown={onTagMouseDown}
                  onMouseUp={onTagMouseUp}>
                  { props.curation.game.tags ? (
                    props.curation.game.tags.map((tag, index) => {
                      const category = props.tagCategories.find(tc => tc.id === tag.categoryId);
                      return (
                        <div
                          className='curate-tag'
                          key={index}
                          { ...{ [tagIndexAttr]: tag.id } }>
                          <OpenIcon
                            className='curate-tag__icon'
                            color={category ? category.color : '#FFFFFF'}
                            icon='x' />
                          <span className='curate-tag__text'>
                            {tag.primaryAlias.name}
                          </span>
                        </div>
                      );
                    })
                  ) : undefined }
                </td>
              </tr>
              {/* End of Tag List */}
              <CurateBoxInputRow
                title={strings.browse.playMode}
                text={props.curation.game.playMode}
                placeholder={strings.browse.noPlayMode}
                property='playMode'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.status}
                text={props.curation.game.status}
                placeholder={strings.browse.noStatus}
                property='status'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.version}
                text={props.curation.game.version}
                placeholder={strings.browse.noVersion}
                property='version'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.releaseDate}
                text={props.curation.game.releaseDate}
                placeholder={strings.browse.noReleaseDate}
                property='releaseDate'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.language}
                text={props.curation.game.language}
                placeholder={strings.browse.noLanguage}
                property='language'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.source}
                text={props.curation.game.source}
                placeholder={strings.browse.noSource}
                property='source'
                { ...shared } />
              <CurateBoxDropdownInputRow
                title={strings.browse.platform}
                text={props.curation.game.platform}
                placeholder={strings.browse.noPlatform}
                items={props.suggestions.platform}
                property='platform'
                { ...shared } />
              <CurateBoxDropdownInputRow
                title={strings.browse.applicationPath}
                text={props.curation.game.applicationPath}
                placeholder={strings.browse.noApplicationPath}
                items={props.suggestions.applicationPath}
                property='applicationPath'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.launchCommand}
                text={props.curation.game.launchCommand}
                placeholder={strings.browse.noLaunchCommand}
                property='launchCommand'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.mountParameters}
                text={props.curation.game.mountParameters}
                placeholder={strings.browse.noMountParameters}
                property='mountParameters'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.notes}
                text={props.curation.game.notes}
                placeholder={strings.browse.noNotes}
                property='notes'
                multiline={true}
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.originalDescription}
                text={props.curation.game.originalDescription}
                placeholder={strings.browse.noOriginalDescription}
                property='originalDescription'
                multiline={true}
                { ...shared } />
              <CurateBoxInputRow
                title={strings.curate.curationNotes}
                text={props.curation.game.curationNotes}
                placeholder={strings.curate.noCurationNotes}
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

function findAncestorRowTagID(element: Element): number | undefined {
  const ancestor = findElementAncestor(element, target => target.getAttribute(tagIndexAttr) !== null, true);
  if (!ancestor) { return undefined; }

  const index = ancestor.getAttribute(tagIndexAttr);
  if (typeof index !== 'string') { throw new Error('Failed to get attribute from ancestor!'); }

  return (index as any) * 1; // Coerce to number
}
