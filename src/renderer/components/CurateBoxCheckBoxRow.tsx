import { CheckBox } from '@renderer/components/CheckBox';
import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { CurateActionType } from '@renderer/store/curate/enums';
import { CurateAction } from '@renderer/store/curate/types';
import { EditCurationMeta } from '@shared/curate/types';
import * as React from 'react';
import { Dispatch } from 'redux';

export type CurateBoxCheckBoxProps = {
  title: string;
  checked: boolean | undefined;
  property: keyof EditCurationMeta;
  curationKey: string;
  disabled: boolean;
  dispatch: Dispatch<CurateAction>;
}

export function CurateBoxCheckBox(props: CurateBoxCheckBoxProps) {
  const onChange = useOnCheckboxToggle(props.property, props.curationKey, props.dispatch);

  return (
    <CurateBoxRow title={props.title + ':'}>
      <CheckBox
        checked={props.checked}
        onToggle={onChange}
        disabled={props.disabled} />
    </CurateBoxRow>
  );
}

function useOnCheckboxToggle(property: keyof EditCurationMeta, key: string | undefined, dispatch: Dispatch<CurateAction>) {
  return React.useCallback((checked: boolean) => {
    if (key !== undefined) {
      dispatch({
        type: CurateActionType.EDIT_CURATION_META,
        payload: {
          key: key,
          property: property,
          value: checked
        }
      });
    }
  }, [dispatch, key]);
}
