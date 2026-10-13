import { CheckBox } from '@renderer/components/CheckBox';
import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { useAppDispatch } from '@renderer/hooks/useAppSelector';
import { editCurationMeta } from '@renderer/store/curate/slice';
import { CurationMeta } from '@shared/curate/types';
import { Dispatch } from 'redux';

export type CurateBoxCheckBoxProps = {
  title: string;
  checked: boolean | undefined;
  property: keyof CurationMeta;
  curationFolder: string;
  disabled: boolean;
}

export function CurateBoxCheckBox(props: CurateBoxCheckBoxProps) {
  const dispatch = useAppDispatch();
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
  return (checked: boolean) => {
    if (folder !== undefined) {
      dispatch(editCurationMeta({
        folder,
        property,
        value: checked,
      }));
    }
  };
}
