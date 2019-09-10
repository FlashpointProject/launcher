import * as React from 'react';
import { useCallback } from 'react';
import { CurationAction, EditAddAppCuration, EditAddAppCurationMeta } from '../context/CurationContext';
import { LangContext } from '../util/lang';
import { CurateBoxRow } from './CurateBoxRow';
import { InputField } from './InputField';

export type CurateBoxAddAppProps = {
  /** Key of the curation the displayed additional application belongs to. */
  curationKey: string;
  /** Meta data for the additional application to display. */
  curation: EditAddAppCuration;
  /** If editing any fields of this should be disabled. */
  disabled?: boolean;
  /** Dispatcher for the curate page state reducer. */
  dispatch: React.Dispatch<CurationAction>;
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
  // Render
  return (
    <div className='curate-box-add-app'>
      <CurateBoxRow title={strings.curate.heading + ':'}>
        <InputField
          text={props.curation && props.curation.meta.heading || ''}
          placeholder={strings.curate.noHeading}
          onChange={onHeadingChange}
          editable={editable}
          disabled={disabled}
          onKeyDown={props.onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.applicationPath + ':'}>
        <InputField
          text={props.curation && props.curation.meta.applicationPath || ''}
          placeholder={strings.browse.noApplicationPath}
          onChange={onApplicationPathChange}
          editable={editable}
          disabled={disabled}
          onKeyDown={props.onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.launchCommand + ':'}>
        <InputField
          text={props.curation && props.curation.meta.launchCommand || ''}
          placeholder={strings.browse.noLaunchCommand}
          onChange={onLaunchCommandChange}
          editable={editable}
          disabled={disabled}
          onKeyDown={props.onInputKeyDown} />
      </CurateBoxRow>
    </div>
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
