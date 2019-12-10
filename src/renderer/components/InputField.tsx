import * as React from 'react';

/** Input element types used by this component. */
export type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type InputFieldProps = {
  /** Displayed text. */
  text: string;
  /** Placeholder text (used to set the "placeholder" attribute). */
  placeholder?: string;
  /**
   * If the text element should be an "editable" element or not.
   * If true, the text element will be an input or text area element (depending on of multiline is enabled).
   * If false or undefined, the text element will be a paragraph element (<p>).
   */
  editable?: boolean;
  /** If the text element should be disabled (only applicable to editable elements). */
  disabled?: boolean;
  /** If the text field should support multi-line text (while "editable"). */
  multiline?: boolean;
  /** Class name(s) of the element. */
  className?: string;
  /** Reference of the element. */
  reference?: React.RefObject<any>;
  /** Called when the text has been changed (while "editable"). */
  onChange?: (event: React.ChangeEvent<InputElement>) => void;
  /** Called when the text has been clicked. */
  onClick?: (event: React.MouseEvent<InputElement | HTMLParagraphElement>) => void;
  /** Called when a key is pressed (while "editable" and focused). */
  onKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
};

/** A generic input field. */
export function InputField(props: InputFieldProps) {
  const { className, disabled, editable, multiline, onChange, onClick, onKeyDown, placeholder, reference, text } = props;
  let cleanClassName = (className ? ' '+className : '');
  if (disabled) { cleanClassName += ' simple-input--disabled'; }
  if (editable) {
    if (multiline) {
      return (
        <textarea
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          ref={reference}
          onChange={onChange}
          onClick={onClick}
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
          onClick={onClick}
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
        onClick={onClick}
        ref={reference}>
        {props.text || props.placeholder}
      </p>
    );
  }
}
