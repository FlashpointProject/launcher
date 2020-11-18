import * as React from 'react';
import { ConfigBox, ConfigBoxProps } from './ConfigBox';
import { InputField, InputFieldProps } from './InputField';

export type ConfigBoxInputProps = ConfigBoxProps & InputFieldProps;

export function ConfigBoxInput(props: ConfigBoxInputProps) {
  return (
    <ConfigBox {...props}>
      <InputField {...props}/>
    </ConfigBox>
  );
}
