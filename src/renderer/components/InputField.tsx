import { checkIfAncestor } from '@renderer/Util';
import { Subtract } from '@shared/interfaces';
import * as React from 'react';

/** Input element types used by this component. */
export type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type InputFieldProps = {
  /** Displayed text. */
  text: string;
  /** Placeholder text (used to set the "placeholder" attribute). */
  placeholder?: string;
  /**
   * If the text element should be an "editable" element or not.
   * If true, the text element will be an input or text area element (depending on of multiline is enabled).
   * If false or undefined, the text element will be a paragraph element (<p>).
   */
  editable?: boolean;
  /** If the text element should be disabled (only applicable to editable elements). */
  disabled?: boolean;
  /** If the text field should support multi-line text (while "editable"). */
  multiline?: boolean;
  /** Class name(s) of the element. */
  className?: string;
  /** Reference of the element. */
  reference?: React.RefObject<any>;
  /** Called when the text has been changed (while "editable"). */
  onChange?: (event: React.ChangeEvent<InputElement>) => void;
  /** Called when the text has been clicked. */
  onClick?: (event: React.MouseEvent<InputElement | HTMLParagraphElement>) => void;
  /** Called when a key is pressed (while "editable" and focused). */
  onKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
};

/** A generic input field. */
export function InputField(props: InputFieldProps) {
  const { className, disabled, editable, multiline, onChange, onClick, onKeyDown, placeholder, reference, text } = props;
  let cleanClassName = (className ? ' '+className : '');
  if (disabled) { cleanClassName += ' simple-input--disabled'; }
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
          className={'input-field input-field--multiline input-field--edit simple-input simple-scroll' + cleanClassName} />
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
          className={'input-field input-field--edit simple-input' + cleanClassName} />
      );
    }
  } else {
    let cn = 'input-field';
    if (!text)     { cn += ' simple-disabled-text';   }
    if (multiline) { cn += ' input-field--multiline'; }
    if (className) { cn += cleanClassName;            }
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
      const inputElement = inputRef.current;
      if (inputElement) { inputElement.blur(); }
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
          props.onChange && props.onChange(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            props.onEnter(value);
            setValue('');
          }
          props.onKeyDown && props.onKeyDown(e);
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

/** Get the index of an item element (or -1 if index was not found). */
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
