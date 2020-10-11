import { CheckBox } from '@renderer/components/CheckBox';
import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { CurateActionType } from '@renderer/store/curate/enums';
import { CurateAction, CurationMeta } from '@renderer/store/curate/types';
import * as React from 'react';
import { Dispatch } from 'redux';

export type CurateBoxCheckBoxProps = {
  title: string;
  checked: boolean | undefined;
  property: keyof CurationMeta;
  curationFolder: string;
  disabled: boolean;
  dispatch: Dispatch<CurateAction>;
}

export function CurateBoxCheckBox(props: CurateBoxCheckBoxProps) {
  const onChange = useOnCheckboxToggle(props.property, props.curationFolder, props.dispatch);

  return (
    <CurateBoxRow title={props.title + ':'}>
      <CheckBox
        checked={props.checked}
        onToggle={onChange}
        disabled={props.disabled} />
    </CurateBoxRow>
  );
}

function useOnCheckboxToggle(property: keyof CurationMeta, folder: string | undefined, dispatch: Dispatch<CurateAction>) {
  return React.useCallback((checked: boolean) => {
    if (folder !== undefined) {
      dispatch({
        type: CurateActionType.EDIT_CURATION_META,
        folder: folder,
        property: property,
        value: checked,
      });
    }
  }, [dispatch, folder]);
}
