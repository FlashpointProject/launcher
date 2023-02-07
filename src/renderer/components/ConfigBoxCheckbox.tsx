import { CheckBox, CheckBoxProps } from './CheckBox';
import { ConfigBox, ConfigBoxProps } from './ConfigBox';

export type ConfigBoxCheckboxProps = ConfigBoxProps & CheckBoxProps;

export function ConfigBoxCheckbox(props: ConfigBoxCheckboxProps) {
  return (
    <ConfigBox
      {...props}
      contentClassName={`${props.contentClassName || ''} setting__row__content--toggle`}>
      <div>
        <CheckBox {...props}/>
      </div>
    </ConfigBox>
  );
}
