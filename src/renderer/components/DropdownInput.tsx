import { useStateRef } from '@renderer/hooks/useStateRef';
import { checkIfAncestor } from '@renderer/Util';
import * as React from 'react';
import { InputElement, InputField, InputFieldProps } from './InputField';

/**
 * A reference callback to a value.
 * This is called every time the value has possibly changed.
 */
export type RefFunc<T> = (instance: T | null) => void;

type DropdownInputProps<T> = InputFieldProps & {
  items?: T[];
  render: (item: T, index: number) => JSX.Element | undefined;
  onItemSelect?: (item: T, index: number) => void;
  /** Note: The reference must be used in the first render and must never change! */
  inputRef?: RefFunc<InputElement> | React.RefObject<InputElement>;
}

export const DDI_INDEX = 'data-dropdown-index';

export function DropdownInput<T>(props: DropdownInputProps<T>): JSX.Element {
  const [expanded, setExpanded] = useStateRef<boolean>(false);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<InputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Mount & Unmount
  React.useEffect(() => {
    const onGlobalMouseDown = (event: MouseEvent) => {
      if (expanded.ref.current && !event.defaultPrevented) {
        if (!checkIfAncestor(event.target as Element | null, rootRef.current)) {
          setExpanded(false);
        }
      }
    };

    const onGlobalKeyDown = (event: KeyboardEvent): void => {
      if (expanded.ref.current && event.key === 'Escape') {
        setExpanded(false);
        if (!inputRef.current) { throw new Error('Input element is missing'); }
        inputRef.current.focus();
      }
    };

    document.addEventListener('mousedown', onGlobalMouseDown);
    document.addEventListener('keydown', onGlobalKeyDown);

    return () => {
      document.removeEventListener('mousedown', onGlobalMouseDown);
      document.removeEventListener('keydown', onGlobalKeyDown);
      updateRef(props.inputRef, inputRef.current || null);
    };
  });

  React.useLayoutEffect(() => {
    updateRef(props.inputRef, inputRef.current || null);
  });

  const onBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget && !checkIfAncestor(event.relatedTarget as any, rootRef.current)) {
      setExpanded(false);
    }
  }, []);

  const onInputChange = React.useCallback((event: React.ChangeEvent<InputElement>) => {
    if (props.disabled) { return; }

    if (!expanded.ref.current) { setExpanded(true); }
    if (props.onChange) { props.onChange(event); }
  }, [props.disabled, props.onChange]);

  const onInputKeyDown = React.useCallback((event: React.KeyboardEvent<InputElement>): void => {
    if (props.disabled) { return; }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();

      if (!expanded.ref.current) { setExpanded(true); }

      // Focus first/last item
      if (!contentRef.current) { throw new Error('dropdown input field content div is missing'); }
      const element: any = (event.key === 'ArrowUp') ? contentRef.current.lastChild : contentRef.current.firstChild;
      if (element && element.focus) { element.focus(); }
    }

    if (props.onKeyDown) { props.onKeyDown(event); }
  }, [props.disabled, props.onKeyDown]);


  const onExpandButtonMouseDown = React.useCallback((): void => {
    if (props.disabled) { return; }

    setExpanded(!expanded.ref.current);
  }, [props.disabled]);

  const onListItemClick = React.useCallback((event: React.MouseEvent): void => {
    if (props.disabled) { return; }

    setExpanded(false);

    if (props.onItemSelect) {
      const index = getListItemIndex(event.target);
      if (index >= 0) {
        if (!props.items) { throw new Error('Dropdown items missing!'); }
        props.onItemSelect(props.items[index], index);
      }
    }
  }, [props.disabled, props.items, props.onItemSelect]);

  const onListItemKeyDown = React.useCallback((event: React.KeyboardEvent): void => {
    if (props.disabled) { return; }

    // Select the focused list item
    if (props.onItemSelect && (event.key === 'Enter' || event.key === ' ')) {
      const index = getListItemIndex(event.target);
      if (index >= 0) {
        if (!props.items) { throw new Error('Dropdown items missing!'); }
        props.onItemSelect(props.items[index], index);
        setExpanded(false);
        // Focus the input element
        const input = inputRef.current;
        if (input && input.focus) { input.focus(); }
      }
    }

    // Move focus up or down
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const element = document.activeElement;
      if (element && checkIfAncestor(element, contentRef.current)) {
        const next: any = (event.key === 'ArrowUp')
          ? element.previousSibling
          : element.nextElementSibling;
        if (next && next.focus) {
          next.focus();
          event.preventDefault();
        }
      }
    } else {
      if (!expanded.ref.current) { setExpanded(true); }
    }
  }, [props.disabled, props.items, props.onItemSelect]);

  const renderedItems = React.useMemo(() => (
    props.items ? props.items.map(props.render) : []
  ), [props.items, props.render]);

  return (
    <div
      className={'input-dropdown' + (props.disabled ? ' input-dropdown--disabled' : '')}
      ref={rootRef}
      onBlur={onBlur}>
      <div className='input-dropdown__input-field'>
        <input
          className='input-dropdown__input-field__back'
          tabIndex={-1}
          readOnly={true} />
        <div className='input-dropdown__input-field__input'>
          <InputField
            { ...props }
            className={(props.className || '') + ' input-dropdown__input-field__input__inner'}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            reference={inputRef} />
        </div>
        <div
          className='input-dropdown__input-field__button'
          onMouseDown={onExpandButtonMouseDown} />
      </div>
      <div
        className={'input-dropdown__content simple-scroll' + (expanded.value ? '' : ' input-dropdown__content--hidden')}
        onClick={onListItemClick}
        onKeyDown={onListItemKeyDown}
        ref={contentRef}>
        { renderedItems }
      </div>
    </div>
  );
}

/** Get the index of an item element (or -1 if index was not found). */
function getListItemIndex(target: unknown): number {
  if (target instanceof Element || target instanceof HTMLElement) {
    return parseInt(target.getAttribute(DDI_INDEX) || '-1', 10);
  }
  return -1;
}

function updateRef<T>(ref: RefFunc<T> | React.RefObject<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
  } else if (typeof ref === 'object' && ref !== null) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}
