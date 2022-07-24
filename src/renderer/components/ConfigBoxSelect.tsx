import { memoizeOne } from '@renderer/util/memoize';
import * as React from 'react';
import { ConfigBox, ConfigBoxProps } from './ConfigBox';

export type SelectItem = {
  value: string;
  display?: string;
}

export type ConfigBoxSelectProps = ConfigBoxProps & {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  items: SelectItem[];
};

export function ConfigBoxSelect(props: ConfigBoxSelectProps) {
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

const renderSelectItemsMemo = memoizeOne((selectItems: SelectItem[]): JSX.Element[] => {
  return selectItems.map((item, idx)=> (
    <option
      key={idx}
      value={item.value}>
      {item.display || item.value}
    </option>
  ));
});
