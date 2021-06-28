import * as React from 'react';
import { ConfigBox, ConfigBoxProps } from './ConfigBox';
import { SimpleButton, SimpleButtonProps } from './SimpleButton';

export type ConfigBoxButtonProps = ConfigBoxProps & SimpleButtonProps;

export function ConfigBoxButton(props: ConfigBoxButtonProps) {
  return (
    <ConfigBox
      {...props}
      contentClassName={`${props.contentClassName || ''} setting__row__content--button`}>
      <div>
        <SimpleButton {...props} />
      </div>
    </ConfigBox>
  );
}
