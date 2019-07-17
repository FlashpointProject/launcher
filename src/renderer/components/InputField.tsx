import * as React from 'react';

/** Input element types used by this component. */
type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type InputFieldProps = {
  /** Current text. */
  text: string;
  /** Placeholder text (used to set the "placeholder" attribute). */
  placeholder?: string;
  /** If the text should be shown in an editable element (input / text area). */
  canEdit?: boolean;
  /** If the text element should be disabled (only applicable to editable elements). */
  disabled?: boolean;
  /** If the text field should support multi-line text. */
  multiline?: boolean;
  /** Class names of the element. */
  className?: string;
  /** Reference of the element. */
  reference?: React.RefObject<any>;
  /** Called when the text has been changed. */
  onChange?: (event: React.ChangeEvent<InputElement>) => void;
  /** Called when a key is pressed. */
  onKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
};

/** A generic input field. */
export function InputField(props: InputFieldProps) {
  const { canEdit, className, disabled, multiline, onChange, onKeyDown, placeholder, reference, text } = props;
  let cleanClassName = (className ? ' '+className : '');
  if (disabled) { cleanClassName += ' simple-input--disabled'; }
  if (canEdit) {
    if (multiline) {
      return (
        <textarea
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          ref={reference}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className={'input-field input-field--multiline input-field--edit simple-input simple-scroll' + cleanClassName} />
      );
    } else {
      return (
        <input
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          ref={reference}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className={'input-field input-field--edit simple-input' + cleanClassName} />
      );
    }
  } else {
    let cn = 'input-field';
    if (!text)     { cn += ' simple-disabled-text';   }
    if (multiline) { cn += ' input-field--multiline'; }
    if (className) { cn += cleanClassName;            }
    return (
      <p
        title={props.text}
        className={cn}
        ref={reference}>
        {props.text || props.placeholder}
      </p>
    );
  }
}
