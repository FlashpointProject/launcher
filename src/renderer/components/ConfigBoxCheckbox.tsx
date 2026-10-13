import { ConfigBoxCheckboxProps } from 'flashpoint-launcher-renderer';
import { CheckBox } from './CheckBox';
import { ConfigBox } from './ConfigBox';

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

export function ConfigBoxInnerCheckbox(props: ConfigBoxCheckboxProps) {
  return (
    <div className='setting__inner__row'>
      <div>
        <p className='setting__row__title setting__row__title__inner'>
          {props.title}
        </p>
        <div className='setting__row__description'>
          {props.description}
        </div>
      </div>
      <CheckBox {...props} />
    </div>
  );
}
