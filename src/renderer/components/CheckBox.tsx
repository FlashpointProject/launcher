import * as React from 'react';
import { useCallback } from 'react';
import { Omit } from '@shared/interfaces';

/** Props for an input element. */
type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export type CheckBoxProps = Omit<InputProps, 'type'> & {
  /** Called when the checkbox becomes checked or unchecked. This is called right after "onChange". */
  onToggle?: (isChecked: boolean) => void;
};

/** Basic checkbox element. Wrapper around the <input> element. */
export function CheckBox(props: CheckBoxProps) {
  const { onToggle, onChange, ...rest } = props;
  // Hooks
  const onChangeCallback = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) { onChange(event); }
    if (onToggle) { onToggle(event.target.checked); }
  }, [onToggle, onChange]);
  // Render
  return (
    <input
      { ...rest }
      type='checkbox'
      onChange={onChangeCallback} />
  );
}
