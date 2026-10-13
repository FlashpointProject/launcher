import { checkIfAncestor } from '@renderer/Util';
import { Subtract } from '@shared/interfaces';
import { InputFieldProps } from 'flashpoint-launcher-renderer';
import * as React from 'react';

// A generic input field.
export function InputField(props: InputFieldProps) {
  const { className, disabled, editable, multiline, form, onChange, onClick, onKeyDown, placeholder, reference, text } = props;
  const cleanClassName = className ? className : '';
  if (editable) {
    if (multiline) {
      return (
        <textarea
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          ref={reference}
          onChange={onChange}
          onClick={onClick}
          onKeyDown={onKeyDown}
          className={`input-field input-field--multiline input-field--edit simple-input simple-scroll ${form ? 'input-field-form' : ''} ${cleanClassName} ${disabled ? 'simple-input--disabled' : ''}`} />
      );
    } else {
      return (
        <input
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          ref={reference}
          onChange={onChange}
          onClick={onClick}
          onKeyDown={onKeyDown}
          className={`input-field input-field--edit simple-input ${form ? 'input-field-form' : ''} ${cleanClassName}`} />
      );
    }
  } else {
    let cn = 'input-field';
    if (!text)     { cn += ' simple-disabled-text';   }
    if (multiline) { cn += ' input-field--multiline'; }
    if (className) { cn += ' ' + cleanClassName;            }
    if (form)      { cn += ' input-fielf-form'; }
    return (
      <p
        title={props.text}
        className={cn}
        onClick={onClick}
        ref={reference}>
        {props.text || props.placeholder}
      </p>
    );
  }
}

export type InputFieldEntryProps = Subtract<InputFieldProps, {
  text: string;
}> & {
  onEnter: (value: string) => void;
  suggestions?: string[];
}

export function InputFieldEntry(props: InputFieldEntryProps) {
  const { suggestions } = props;
  const [value, setValue] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onGlobalMouseDown = (event: MouseEvent) => {
      if (expanded && !event.defaultPrevented) {
        if (!checkIfAncestor(event.target as Element | null, rootRef.current)) {
          setExpanded(false);
        }
      }
    };

    const onGlobalKeyDown = (event: KeyboardEvent): void => {
      if (expanded && event.key === 'Escape') {
        setExpanded(false);
        if (!inputRef.current) { throw new Error('input field is missing'); }
        inputRef.current.focus();
      }
    };

    document.addEventListener('mousedown', onGlobalMouseDown);
    document.addEventListener('keydown', onGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', onGlobalMouseDown);
      document.removeEventListener('keydown', onGlobalKeyDown);
    };
  }, [expanded]);

  const onSuggestionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const { key } = event;
    const element = document.activeElement ? document.activeElement.parentElement : document.activeElement;
    if (key === 'Enter') {
      const idx = getListItemIndex(element);
      if (idx > -1 && suggestions) {
        props.onEnter(suggestions[idx]);
        setValue('');
        const inputElement = inputRef.current;
        if (inputElement) { inputElement.blur(); }
      }
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      // Focus the first or last item
      if (element && checkIfAncestor(element, contentRef.current)) {
        const nextParent = (key === 'ArrowUp')
          ? element.previousSibling
          : element.nextElementSibling;
        if (nextParent) {
          const nextChild: any = nextParent.lastChild;
          if (nextChild && nextChild.focus) {
            nextChild.focus();
          }
        }
      }
      event.preventDefault();
    }
  };

  const onSuggestionItemClick = (suggestion: string): void => {
    if (!props.disabled) {
      setExpanded(false);
      props.onEnter(suggestion);
      setValue('');
    }
  };

  const suggestionRender = suggestions ? renderSuggestions(value, suggestions, expanded, onSuggestionItemClick) : undefined;

  return (
    <div
      ref={rootRef}
      className='input-dropdown'>
      <InputField
        { ...props }
        reference={inputRef}
        text={value}
        onClick={() => {
          setExpanded(true);
        }}
        onChange={(e) => {
          setValue(e.currentTarget.value);
          if (props.onChange) { props.onChange(e); }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            props.onEnter(value);
            setValue('');
          }
          if (props.onKeyDown) { props.onKeyDown(e); }
        }}/>
      { expanded && suggestionRender ?
        <div
          ref={contentRef}
          onKeyDown={onSuggestionKeyDown}
          className={'input-dropdown__content simple-scroll'} >
          { suggestionRender }
        </div>
        : undefined }
    </div>
  );
}

// Get the index of an item element (or -1 if index was not found).
function getListItemIndex(target: any): number {
  if (target instanceof Element || target instanceof HTMLElement) {
    return parseInt(target.getAttribute('data-dropdown-index') || '-1', 10);
  }
  return -1;
}

function renderSuggestions(value: string, suggestions: string[], expanded: boolean, onSuggestionItemClick: (suggestion: string) => void) {
  const matching = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));
  return matching.map((suggestion, index) => {
    return (
      <div
        onClick={() => onSuggestionItemClick(suggestion)}
        data-dropdown-index={index}
        className='tag-input-dropdown__suggestion' key={index} >
        <label
          className='tag-suggestion-label'
          key={index * 2 + 1}
          tabIndex={0}>
          {suggestion}
        </label>
      </div>
    );
  });
}
