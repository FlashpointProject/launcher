import { ConfigBoxMultiSelectProps, DropdownRowProps, MultiSelectItem } from 'flashpoint-launcher-renderer';
import { ConfigBox } from './ConfigBox';
import { Dropdown } from './Dropdown';

export function ConfigBoxMultiSelect<T>(props: ConfigBoxMultiSelectProps<T>) {
  return (
    <ConfigBox
      {...props}
      // key={props.text}
      contentClassName={`${props.contentClassName || ''} setting__row__content--toggle`}>
      <div>
        <Dropdown<ConfigBoxMultiSelectRowProps<T>>
          text={props.text}
          rowProps={{
            items: props.items,
            onChange: props.onChange
          }}
          rowCount={props.items.length}
          rowRenderer={ConfigBoxMultiSelectRow}>
        </Dropdown>
      </div>
    </ConfigBox>
  );
}

type ConfigBoxMultiSelectRowProps<T> = {
  items: MultiSelectItem<T>[];
  onChange: (item: T) => void;
};

function ConfigBoxMultiSelectRow({ items, onChange, index }: DropdownRowProps<ConfigBoxMultiSelectRowProps<any>>) {
  const item = items[index];

  return (
    <label
      key={index}
      className='log-page__dropdown-item'>
      <div className='simple-center'>
        <input
          type='checkbox'
          checked={item.checked}
          onChange={() => onChange(item.value)}
          className='simple-center__vertical-inner' />
      </div>
      <div className='simple-center'>
        <p className='simple-center__vertical-inner log-page__dropdown-item-text'>
          {item.display || (item.value as any)}
        </p>
      </div>
    </label>
  );
}
