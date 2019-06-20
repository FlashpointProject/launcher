import * as React from 'react';

/** Input element types used by this component. */
type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type InputFieldProps = {
  /** Current text. */
  text: string;
  /** Placeholder text (used to set the "placeholder" attribute). */
  placeholder?: string;
  /** If the text can be edited. */
  canEdit?: boolean;
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
  const { canEdit, className, multiline, onChange, onKeyDown, placeholder, reference, text } = props;
  const cleanClassName = (className ? ' '+className : '');
  if (canEdit) {
    if (multiline) {
      return (
        <textarea
          value={text}
          placeholder={placeholder}
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
