import { FancyAnimation } from '@renderer/components/FancyAnimation';
import { Omit } from '@shared/interfaces';
import * as React from 'react';

/** Props for an input element. */
type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export type CheckBoxProps = Omit<InputProps, 'type' | 'onToggle'> & {
  /** Called when the checkbox becomes checked or unchecked. This is called right after "onChange". */
  onToggle?: (isChecked: boolean) => void;
};

// Basic checkbox element. Wrapper around the <input> element.
export function CheckBox(props: CheckBoxProps) {
  const { onToggle, ...rest } = props;
  // Hooks
  const onChangeCallback = () => {
    if (onToggle) { onToggle(!props.checked); }
  };
  // Render
  return (
    <div
      className={(props.checked ? 'checkbox--checked' : 'checkbox--unchecked') + ' checkbox ' + rest.className}
      onClick={onChangeCallback}>
      <FancyAnimation
        fancyRender={() => (
          <div className={(props.checked ? 'slider slider--animated slider-checked' : 'slider slider--animated')}/>
        )}
        normalRender={() => (
          <div className={(props.checked ? 'slider slider-checked' : 'slider')}/>
        )}/>
    </div>
  );
}
