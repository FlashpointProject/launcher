import * as React from 'react';
import { ConfigBox, ConfigBoxProps } from './ConfigBox';
import { DropdownInputField } from './DropdownInputField';

export type ConfigBoxSelectInputProps = ConfigBoxProps & {
  text: string;
  placeholder: string;
  onChange: (value: string) => void;
  onItemSelect: (value: string, index: number) => void;
  editable: boolean;
  items: string[];
};

export function ConfigBoxSelectInput(props: ConfigBoxSelectInputProps) {
  const [inputRef, setInputRef] = React.useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const inputRefFunc = (ref: HTMLInputElement | HTMLTextAreaElement | null)=> { setInputRef(ref); };

  return (
    <ConfigBox
      {...props}
      contentClassName={`${props.contentClassName || ''} setting__row__content--input-field`}>
      <DropdownInputField
        text={props.text}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        editable={props.editable}
        items={props.items}
        onItemSelect={(text, index) => onItemSelect(text, index, inputRef, props.onItemSelect)}
        inputRef={inputRefFunc} />
    </ConfigBox>
  );
}

function onItemSelect(value: string, index: number, inputRef: HTMLInputElement | HTMLTextAreaElement | null, onChange: (value: string, index: number) => void) {
  if (inputRef) {
    inputRef.focus();
  }
  onChange(value, index);
}
