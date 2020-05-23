import { BackIn, LaunchCurationAddAppData } from '@shared/back/types';
import { EditAddAppCuration, EditAddAppCurationMeta } from '@shared/curate/types';
import * as React from 'react';
import { useCallback } from 'react';
import { CurationAction } from '../context/CurationContext';
import { LangContext } from '../util/lang';
import { CurateBoxRow } from './CurateBoxRow';
import { InputField } from './InputField';
import { SimpleButton } from './SimpleButton';

export type CurateBoxAddAppProps = {
  /** Key of the curation the displayed additional application belongs to. */
  curationKey: string;
  /** Meta data for the additional application to display. */
  curation: EditAddAppCuration;
  /** If editing any fields of this should be disabled. */
  disabled?: boolean;
  /** Dispatcher for the curate page state reducer. */
  dispatch: React.Dispatch<CurationAction>;
  /** Platform of the game this belongs to. */
  platform?: string;
  /** Callback for the "onKeyDown" event for all input fields. */
  onInputKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
};

export function CurateBoxAddApp(props: CurateBoxAddAppProps) {
  // Callbacks for the fields (onChange)
  const curationKey = props.curationKey;
  const key = props.curation.key;
  const onHeadingChange         = useOnInputChange('heading',         key, curationKey, props.dispatch);
  const onApplicationPathChange = useOnInputChange('applicationPath', key, curationKey, props.dispatch);
  const onLaunchCommandChange   = useOnInputChange('launchCommand',   key, curationKey, props.dispatch);
  // Misc.
  const editable = true;
  const disabled = props.disabled;
  // Localized strings
  const strings = React.useContext(LangContext);
  const specialType = props.curation.meta.applicationPath === ':extras:' || props.curation.meta.applicationPath === ':message:';
  let lcString = strings.browse.launchCommand;
  let lcPlaceholderString = strings.browse.noLaunchCommand;
  // Change Launch Command strings depending on add app type
  switch (props.curation.meta.applicationPath) {
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
    props.dispatch({
      type: 'remove-addapp',
      payload: {
        curationKey: props.curationKey,
        key: props.curation.key
      }
    });
  }, [props.curationKey, props.curation.key, props.dispatch]);
  // Callback for the "run" button
  const onRun = useCallback(() => {
    return window.Shared.back.sendP<any, LaunchCurationAddAppData>(BackIn.LAUNCH_CURATION_ADDAPP, {
      curationKey: props.curationKey,
      curation: props.curation,
      platform: props.platform,
    });
  }, [props.curation && props.curation.meta && props.curationKey]);
  // Render
  return (
    <tr className='curate-box-add-app'>
        <CurateBoxRow title={strings.curate.heading + ':'}>
          <InputField
            text={props.curation && props.curation.meta.heading || ''}
            placeholder={strings.curate.noHeading}
            onChange={onHeadingChange}
            editable={editable}
            disabled={disabled}
            onKeyDown={props.onInputKeyDown} />
        </CurateBoxRow>
        {specialType ? undefined :
        <CurateBoxRow title={strings.browse.applicationPath + ':'}>
          <InputField
            text={props.curation && props.curation.meta.applicationPath || ''}
            placeholder={strings.browse.noApplicationPath}
            onChange={onApplicationPathChange}
            editable={editable}
            disabled={disabled}
            onKeyDown={props.onInputKeyDown} />
        </CurateBoxRow>
        }
        <CurateBoxRow title={lcString + ':'}>
          <InputField
            text={props.curation && props.curation.meta.launchCommand || ''}
            placeholder={lcPlaceholderString}
            onChange={onLaunchCommandChange}
            editable={editable}
            disabled={disabled}
            onKeyDown={props.onInputKeyDown} />
        </CurateBoxRow>
        <SimpleButton
          className='curate-box-buttons__button'
          value={strings.curate.removeAddApp}
          disabled={disabled}
          onClick={onRemove} />
        <SimpleButton
          className='curate-box-buttons__button'
          value={strings.curate.run}
          disabled={disabled}
          onClick={onRun} />
  </tr>
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
 * @param property Property the input field should change.
 * @param curationKey Key of the curation the additional application belongs to.
 * @param key Key of the additional application to edit.
 * @param dispatch Dispatcher to use.
 */
function useOnInputChange(property: keyof EditAddAppCurationMeta, key: string, curationKey: string, dispatch: React.Dispatch<CurationAction>) {
  return useCallback((event: InputElementOnChangeEvent) => {
    if (key !== undefined) {
      dispatch({
        type: 'edit-addapp-meta',
        payload: {
          curationKey: curationKey,
          key: key,
          property: property,
          value: event.currentTarget.value
        }
      });
    }
  }, [dispatch, key]);
}
