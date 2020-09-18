import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { InputElement, InputField } from '@renderer/components/InputField';
import { CurateActionType } from '@renderer/store/curate/enums';
import { CurateAction } from '@renderer/store/curate/types';
import { EditCurationMeta } from '@shared/curate/types';
import * as React from 'react';
import { Dispatch } from 'redux';

export type CurateBoxInputRowProps = {
  title: string;
  text: string | undefined;
  placeholder: string;
  property: keyof EditCurationMeta;
  multiline?: boolean;
  curationKey: string;
  disabled: boolean;
  dispatch: Dispatch<CurateAction>;
}

export function CurateBoxInputRow(props: CurateBoxInputRowProps) {
  const onChange = useOnInputChange(props.property, props.curationKey, props.dispatch);

  return (
    <CurateBoxRow title={props.title + ':'}>
      <InputField
        text={props.text || ''}
        placeholder={props.placeholder}
        onChange={onChange}
        disabled={props.disabled}
        multiline={props.multiline}
        editable={true} />
    </CurateBoxRow>
  );
}

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
 * @param key Key of the curation to edit.
 * @param dispatch Dispatcher to use.
 */
function useOnInputChange(property: keyof EditCurationMeta, key: string | undefined, dispatch: Dispatch<CurateAction>) {
  return React.useCallback((event: InputElementOnChangeEvent) => {
    if (key !== undefined) {
      dispatch({
        type: CurateActionType.EDIT_CURATION_META,
        payload: {
          key: key,
          property: property,
          value: event.currentTarget.value
        }
      });
    }
  }, [dispatch, key]);
}
