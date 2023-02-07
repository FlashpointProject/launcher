import { ConfigBox, ConfigBoxProps } from './ConfigBox';
import { SelectItem } from './ConfigBoxSelect';
import { Dropdown } from './Dropdown';

export type ConfigBoxMultiSelectProps = ConfigBoxProps & {
  text: string;
  onChange: (item: string) => void;
  items: MultiSelectItem[];
};

export type MultiSelectItem = SelectItem & {
  checked: boolean;
}

export function ConfigBoxMultiSelect(props: ConfigBoxMultiSelectProps) {
  return (
    <ConfigBox
      {...props}
      // key={props.text}
      contentClassName={`${props.contentClassName || ''} setting__row__content--toggle`}>
      <div>
        <Dropdown
          text={props.text}>
          {renderMultiSelectItems(props.items, props.onChange)}
        </Dropdown>
      </div>
    </ConfigBox>
  );
}

function renderMultiSelectItems(items: MultiSelectItem[], onChange: (item: string) => void): JSX.Element[] {
  return items.map((item, idx) => (
    <label
      key={idx}
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
          {item.display || item.value}
        </p>
      </div>
    </label>
  ));
}
