import { ConfigBoxInputProps } from 'flashpoint-launcher-renderer';
import { ConfigBox } from './ConfigBox';
import { InputField } from './InputField';

export function ConfigBoxInput(props: ConfigBoxInputProps) {
  return (
    <ConfigBox
      {...props}
      swapChildren={props.multiline ? true : props.swapChildren}
      contentClassName={`${props.contentClassName || ''} setting__row__content--input-field`}>
      <InputField {...props}/>
    </ConfigBox>
  );
}
