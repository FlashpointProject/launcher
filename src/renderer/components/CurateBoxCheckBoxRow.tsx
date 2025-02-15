import { CheckBox } from '@renderer/components/CheckBox';
import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { CurationMeta } from '@shared/curate/types';
import * as React from 'react';
import { Dispatch } from 'redux';
import { useDispatch } from 'react-redux';
import { editCurationMeta } from '@renderer/store/curate/slice';

export type CurateBoxCheckBoxProps = {
  title: string;
  checked: boolean | undefined;
  property: keyof CurationMeta;
  curationFolder: string;
  disabled: boolean;
}

export function CurateBoxCheckBox(props: CurateBoxCheckBoxProps) {
  const dispatch = useDispatch();
  const onChange = useOnCheckboxToggle(props.property, props.curationFolder, dispatch);

  return (
    <CurateBoxRow title={props.title}>
      <CheckBox
        checked={props.checked}
        onToggle={onChange}
        disabled={props.disabled} />
    </CurateBoxRow>
  );
}

function useOnCheckboxToggle(property: keyof CurationMeta, folder: string | undefined, dispatch: Dispatch) {
  return React.useCallback((checked: boolean) => {
    if (folder !== undefined) {
      dispatch(editCurationMeta({
        folder,
        property,
        value: checked,
      }));
    }
  }, [dispatch, folder]);
}
