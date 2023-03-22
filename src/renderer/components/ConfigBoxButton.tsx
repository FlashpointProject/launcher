import { ConfigBox, ConfigBoxProps } from './ConfigBox';
import { SimpleButton, SimpleButtonProps } from './SimpleButton';

export type ConfigBoxButtonProps = ConfigBoxProps & SimpleButtonProps;

export function ConfigBoxButton(props: ConfigBoxButtonProps) {
  return (
    <ConfigBox
      {...props}
      contentClassName={`${props.contentClassName || ''} setting__row__content--button`}>
      <div>
        <SimpleButton
          className='setting__row__button'
          {...props} />
      </div>
    </ConfigBox>
  );
}

export function ConfigBoxInnerButton(props: ConfigBoxButtonProps) {
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
      <SimpleButton
        className='setting__row__button'
        {...props} />
    </div>
  );
}
