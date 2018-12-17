import * as React from 'react';

type InputElement = HTMLInputElement|HTMLTextAreaElement;

export interface InputFieldProps {
  text: string;
  placeholder?: string;
  canEdit?: boolean;
  multiline?: boolean;
  className?: string;
  reference?: React.RefObject<any>;
  onChange?: (event: React.ChangeEvent<InputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
}

export function InputField(props: InputFieldProps) {
  const { canEdit, className, multiline, onChange, onKeyDown, placeholder, reference, text } = props;
  if (canEdit) {
    if (multiline) {
      return (
        <textarea value={text} placeholder={placeholder} ref={reference}
                  onChange={onChange || noop} onKeyDown={onKeyDown || noop}
                  className={'browse-right-sidebar__row__editable-text browse-right-sidebar__row__editable-text--multiline browse-right-sidebar__row__editable-text--edit simple-input simple-scroll'+
                             (className ? ' '+className : '')} />
      );
    } else {
      return (
        <input value={text} placeholder={placeholder} ref={reference}
               onChange={onChange || noop} onKeyDown={onKeyDown || noop}
               className={'browse-right-sidebar__row__editable-text browse-right-sidebar__row__editable-text--edit simple-input'+
                          (className ? ' '+className : '')} />
      );
    }
  } else {
    let cn = 'browse-right-sidebar__row__editable-text';
    if (!text)     { cn += ' simple-disabled-text'; }
    if (multiline) { cn += ' browse-right-sidebar__row__editable-text--multiline'; }
    if (className) { cn += ' '+className; }
    return (
      <p title={props.text} className={cn} ref={reference}>
        {props.text || props.placeholder}
      </p>
    );
  }
}

const noop = () => {};
