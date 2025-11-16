import { memoizeOne } from '@shared/memoize';
import { ConfigBoxSelectProps, SelectItem } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { ConfigBox } from './ConfigBox';

export function ConfigBoxSelect<T extends string | number>(props: ConfigBoxSelectProps<T>) {
  return (
    <ConfigBox
      {...props}
      contentClassName={`${props.contentClassName || ''} setting__row__content--toggle`}>
      <div>
        <select
          className='simple-selector'
          value={props.value}
          onChange={props.onChange}>
          {renderSelectItemsMemo(props.items)}
        </select>
      </div>
    </ConfigBox>
  );
}

const renderSelectItemsMemo = memoizeOne(<T extends string | number>(selectItems: SelectItem<T>[]): React.JSX.Element[] => {
  return selectItems.map((item, idx)=> (
    <option
      key={idx}
      value={item.value}>
      {item.display || item.value}
    </option>
  ));
});
