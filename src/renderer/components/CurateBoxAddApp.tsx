import { BackIn } from '@shared/back/types';
import { AddAppCuration, AddAppCurationMeta } from '@shared/curate/types';
import * as React from 'react';
import { useCallback } from 'react';
import { LangContext } from '../util/lang';
import { CurateBoxRow } from './CurateBoxRow';
import { InputField } from './InputField';
import { SimpleButton } from './SimpleButton';
import { Platform } from 'flashpoint-launcher';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { editAddApp, removeAddApp } from '@renderer/store/curate/slice';

export type CurateBoxAddAppProps = {
  /** Folder of the curation the displayed additional application belongs to. */
  folder: string;
  /** Meta data for the additional application to display. */
  addApp: AddAppCuration;
  /** If editing any fields of this should be disabled. */
  disabled?: boolean;
  /** Platform of the game this belongs to. */
  platforms?: Platform[];
  /** Whether to symlink curation content before running */
  symlinkCurationContent: boolean;
  /** Callback for the "onKeyDown" event for all input fields. */
  onInputKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
};

export function CurateBoxAddApp(props: CurateBoxAddAppProps) {
  // Callbacks for the fields (onChange)
  const folder = props.folder;
  const key = props.addApp.key;
  const dispatch = useDispatch();
  const onHeadingChange         = useOnInputChange('heading',         key, folder, dispatch);
  const onApplicationPathChange = useOnInputChange('applicationPath', key, folder, dispatch);
  const onLaunchCommandChange   = useOnInputChange('launchCommand',   key, folder, dispatch);
  // Misc.
  const editable = true;
  const disabled = props.disabled;
  // Localized strings
  const strings = React.useContext(LangContext);
  const specialType = props.addApp.applicationPath === ':extras:' || props.addApp.applicationPath === ':message:';
  let lcString = strings.browse.launchCommand;
  let lcPlaceholderString = strings.browse.noLaunchCommand;
  // Change Launch Command strings depending on add app type
  switch (props.addApp.applicationPath) {
    case ':message:':
      lcString = strings.curate.message;
      lcPlaceholderString = strings.curate.noMessage;
      break;
    case ':extras:':
      lcString = strings.curate.folderName;
      lcPlaceholderString = strings.curate.noFolderName;
      break;
  }
  // Callback for the "remove" button
  const onRemove = useCallback(() => {
    dispatch(removeAddApp({
      folder,
      key
    }));
  }, [props.folder, props.addApp.key, dispatch]);
  // Callback for the "run" button
  const onRun = useCallback(() => {
    return window.Shared.back.request(BackIn.LAUNCH_CURATION_ADDAPP, {
      folder: props.folder,
      addApp: props.addApp,
      platforms: props.platforms,
      symlinkCurationContent: props.symlinkCurationContent,
      override: null,
    });
  }, [props.addApp && props.folder, props.symlinkCurationContent, props.platforms]);
  // Render
  return (
    <>
      <CurateBoxRow title={strings.curate.heading}>
        <InputField
          text={props.addApp && props.addApp.heading || ''}
          placeholder={strings.curate.noHeading}
          onChange={onHeadingChange}
          editable={editable}
          disabled={disabled}
          onKeyDown={props.onInputKeyDown} />
      </CurateBoxRow>
      { specialType ? undefined : (
        <CurateBoxRow title={strings.browse.applicationPath}>
          <InputField
            text={props.addApp && props.addApp.applicationPath || ''}
            placeholder={strings.browse.noApplicationPath}
            onChange={onApplicationPathChange}
            editable={editable}
            disabled={disabled}
            onKeyDown={props.onInputKeyDown} />
        </CurateBoxRow>
      ) }
      <CurateBoxRow title={lcString}>
        <InputField
          text={props.addApp && props.addApp.launchCommand || ''}
          placeholder={lcPlaceholderString}
          onChange={onLaunchCommandChange}
          editable={editable}
          disabled={disabled}
          onKeyDown={props.onInputKeyDown} />
      </CurateBoxRow>
      <tr>
        <td className='curate-box-buttons'><SimpleButton
          className='curate-box-buttons__button'
          value={strings.curate.removeAddApp}
          disabled={disabled}
          onClick={onRemove} />
        <SimpleButton
          className='curate-box-buttons__button'
          value={strings.curate.run}
          disabled={disabled}
          onClick={onRun} />
        </td>
      </tr>
    </>
  );
}

type InputElement = HTMLInputElement | HTMLTextAreaElement;

/** Subset of the input elements on change event, with only the properties used by the callbacks. */
type InputElementOnChangeEvent = {
  currentTarget: {
    value: React.ChangeEvent<InputElement>['currentTarget']['value']
  }
}

/**
 * Create a callback for InputField's onChange.
 * When called, the callback will set the value of a metadata property to the value of the input field.
 *
 * @param property Property the input field should change.
 * @param key Key of the additional application to edit.
 * @param folder Folder of the curation that owns this add app.
 * @param dispatch Curate action dispatcher.
 */
function useOnInputChange(property: keyof AddAppCurationMeta, key: string, folder: string, dispatch: Dispatch<any>) {
  return useCallback((event: InputElementOnChangeEvent) => {
    if (key !== undefined) {
      dispatch(editAddApp({
        folder,
        key,
        property,
        value: event.currentTarget.value
      }));
    }
  }, [dispatch, key]);
}
