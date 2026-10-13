import { GameComponentDropdownSelectFieldProps, GameComponentInputFieldProps } from 'flashpoint-launcher-renderer';
import { InputField } from './InputField';
import { DropdownInputFieldMapped } from './DropdownInputField';

export function GameComponentInputField(props: GameComponentInputFieldProps) {
  const { header, onClick, multiline, text, placeholder, onChange, editable, HeaderComponent } = props;
  const headerRender = HeaderComponent ? <HeaderComponent {...props}/> : <p className='browse-right-sidebar__row-header-text'>{header}: </p>;
  return (
    <div className={`browse-right-sidebar__row ${!multiline ? 'browse-right-sidebar__row--one-line' : ''}`}>
      <div className='browse-right-sidebar__row-header'>
        {headerRender}
      </div>
      <InputField
        text={text}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className='browse-right-sidebar__searchable'
        editable={editable}
        multiline={multiline}
        onClick={onClick} />
    </div>
  );
}

export function GameComponentDropdownSelectField({ header, placeholder, text, items, onChange, editable }: GameComponentDropdownSelectFieldProps) {
  return (
    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
      <p>{header}: </p>
      <DropdownInputFieldMapped
        text={text}
        placeholder={placeholder}
        className='browse-right-sidebar__searchable'
        editable={editable}
        items={items}
        onChange={onChange}
        onClick={() => {}} />
    </div>
  );
}
