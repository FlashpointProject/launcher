import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { ConfigBox, ConfigBoxProps } from './ConfigBox';

export type SelectItem<T> = {
  value: T;
  display?: string;
}

export type ConfigBoxSelectProps<T extends string | number> = ConfigBoxProps & {
  value: T;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  items: SelectItem<T>[];
};

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

const renderSelectItemsMemo = memoizeOne(<T extends string | number>(selectItems: SelectItem<T>[]): JSX.Element[] => {
  return selectItems.map((item, idx)=> (
    <option
      key={idx}
      value={item.value}>
      {item.display || item.value}
    </option>
  ));
});
