import * as React from 'react';

export interface InputFieldProps {
  text: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void;
  placeholder: string;
  canEdit: boolean;
  multiline?: boolean;
}

export function InputField(props: InputFieldProps) {
  if (props.canEdit) {
    if (props.multiline) {
      return (
        <textarea value={props.text} placeholder={props.placeholder} onChange={props.onChange}
                  className='browse-right-sidebar__row__editable-text browse-right-sidebar__row__editable-text--multiline browse-right-sidebar__row__editable-text--edit simple-input simple-scroll' />
      );
    } else {
      return (
        <input value={props.text} placeholder={props.placeholder} onChange={props.onChange}
               className='browse-right-sidebar__row__editable-text browse-right-sidebar__row__editable-text--edit simple-input' />
      );
    }
  } else {
    let className = 'browse-right-sidebar__row__editable-text';
    if (!props.text) { className += ' simple-disabled-text'; }
    if (props.multiline) { className += ' browse-right-sidebar__row__editable-text--multiline'; }
    return (
      <p title={props.text} className={className}>
        {props.text || props.placeholder}
      </p>
    );
  }
}
