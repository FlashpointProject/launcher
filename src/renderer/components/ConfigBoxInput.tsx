import { ConfigBox, ConfigBoxProps } from './ConfigBox';
import { InputField, InputFieldProps } from './InputField';

export type ConfigBoxInputProps = ConfigBoxProps & InputFieldProps;

export function ConfigBoxInput(props: ConfigBoxInputProps) {
  return (
    <ConfigBox
      {...props}
      contentClassName={`${props.contentClassName || ''} setting__row__content--input-field`}>
      <InputField {...props}/>
    </ConfigBox>
  );
}
