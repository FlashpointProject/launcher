import * as React from 'react';
import { memoizeOne } from '@shared/memoize';
import { checkIfAncestor } from '../Util';
import { InputField, InputFieldProps } from './InputField';

/** A function that receives a HTML element (or null). */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

/** Input element types used by this component. */
type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type DropdownInputFieldProps = InputFieldProps & {
  /** Items to display in the drop-down list. */
  items: string[];
  /** Called when a drop-down list item is clicked or otherwise "selected". */
  onItemSelect?: (text: string, index: number) => void;
  /** Function for getting a reference to the input element. Called whenever the reference could change. */
  inputRef?: RefFunc<InputElement>;
};

type DropdownInputFieldState = {
  /** If the drop-down content is "expanded" (visible). */
  expanded: boolean;
};

/** An input element with a drop-down menu that can list any number of selectable and clickable text elements. */
export class DropdownInputField extends React.Component<DropdownInputFieldProps, DropdownInputFieldState> {
  rootRef: React.RefObject<HTMLDivElement> = React.createRef();
  contentRef: React.RefObject<HTMLDivElement> = React.createRef();
  inputRef: React.RefObject<InputElement> = React.createRef();

  constructor(props: DropdownInputFieldProps) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.onGlobalMouseDown);
    document.addEventListener('keydown', this.onGlobalKeyDown);
    this.updatePropRefs();
  }

  componentDidUpdate() {
    this.updatePropRefs();
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onGlobalMouseDown);
    document.removeEventListener('keydown', this.onGlobalKeyDown);
    this.updatePropRefs();
  }

  render() {
    const { items, className, editable } = this.props;
    const { expanded } = this.state;
    // Render input field
    const inputField = (
      <InputField
        { ...this.props } 
        className={(className || '') + ' input-dropdown__input-field__input__inner'}
        onChange={this.onInputChange}
        onKeyDown={this.onInputKeyDown}
        reference={this.inputRef} />
    );
    // Render
    if (editable) {
      return (
        <div
          className={'input-dropdown' + (this.props.disabled ? ' input-dropdown--disabled' : '')}
          ref={this.rootRef}
          onBlur={this.onBlur}>
          <div className='input-dropdown__input-field'>
            <input
              className='input-dropdown__input-field__back'
              tabIndex={-1}
              readOnly={true} />
            <div className='input-dropdown__input-field__input'>
              { inputField }
            </div>
            <div
              className='input-dropdown__input-field__button'
              onMouseDown={this.onExpandButtonMouseDown} />
          </div>
          <div
            className={'input-dropdown__content simple-scroll' + (expanded ? '' : ' input-dropdown__content--hidden')}
            onClick={this.onListItemClick}
            onKeyDown={this.onListItemKeyDown}
            ref={this.contentRef}>
            { this.renderItems(items) }
          </div>
        </div>
      );
    } else {
      return inputField;
    }
  }

  /** Renders the list of items in the drop-down menu. */
  renderItems = memoizeOne<(items: string[]) => JSX.Element[]>((items: string[]) => {
    return items.map((text, index) => (
      <label
        key={index}
        data-dropdown-index={index}
        tabIndex={0}>
        {text}
      </label>
    ));
  }, ([ itemsA ], [ itemsB ]) => {
    return checkIfArraysAreEqual(itemsA, itemsB);
  });

  onGlobalMouseDown = (event: MouseEvent) => {
    if (this.state.expanded && !event.defaultPrevented) {
      if (!checkIfAncestor(event.target as Element | null, this.rootRef.current)) {
        this.setState({ expanded: false });
      }
    }
  }

  onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (this.state.expanded && event.key === 'Escape') {
      this.setState({ expanded: false });
      if (!this.inputRef.current) { throw new Error('input field is missing'); }
      this.inputRef.current.focus();
    }
  }

  onListItemClick = (event: React.MouseEvent): void => {
    if (!this.props.disabled) {
      this.setState({ expanded: false });
      if (this.props.onItemSelect) {
        const index = getListItemIndex(event.target);
        if (index >= 0) {
          this.props.onItemSelect(this.props.items[index], index);
        }
      }
    }
  }

  onListItemKeyDown = (event: React.KeyboardEvent): void => {
    if (!this.props.disabled) {
      const { key, target } = event;
      // Select the focused list item
      if (this.props.onItemSelect && (key === 'Enter' || key === ' ')) {
        const index = getListItemIndex(target);
        if (index >= 0) {
          this.props.onItemSelect(this.props.items[index], index);
          this.setState({ expanded: false });
          // Focus the input element
          const input = this.inputRef.current;
          if (input && input.focus) { input.focus(); }
        }
      }
      // Move focus up or down
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        const element = document.activeElement;
        if (element && checkIfAncestor(element, this.contentRef.current)) {
          const next: any = (key === 'ArrowUp') ? element.previousSibling :
                                                  element.nextElementSibling;
          if (next && next.focus) {
            next.focus();
            event.preventDefault();
          }
        }
      } else {
        if (!this.state.expanded) { this.setState({ expanded: true }); }
      }
    }
  }

  onBlur = (event: React.FocusEvent): void => {
    const { relatedTarget } = event;
    if (relatedTarget && !checkIfAncestor(relatedTarget as any, this.rootRef.current)) {
      this.setState({ expanded: false });
    }
  }

  onInputChange = (event: React.ChangeEvent<InputElement>): void => {
    if (!this.props.disabled) {
      if (!this.state.expanded) { this.setState({ expanded: true }); }
      if (this.props.onChange) { this.props.onChange(event); }
    }
  }

  onInputKeyDown = (event: React.KeyboardEvent<InputElement>): void => {
    if (!this.props.disabled) {
      const { key } = event;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        // Focus the first or last item, also expand the content container
        event.preventDefault();
        if (!this.state.expanded) { this.setState({ expanded: true }); }
        const content = this.contentRef.current;
        if (!content) { throw new Error('dropdown input field content div is missing'); }
        const element: any = (key === 'ArrowUp') ? content.lastChild : content.firstChild;
        if (element && element.focus) { element.focus(); }
      }
      // Relay event
      if (this.props.onKeyDown) { this.props.onKeyDown(event); }
    }
  }

  onExpandButtonMouseDown = (): void => {
    if (!this.props.disabled) {
      this.setState({ expanded: !this.state.expanded });
    }
  }

  /**
   * Call the "ref" property functions.
   * Do this whenever there's a possibility that the referenced elements has been replaced.
   */
  updatePropRefs(): void {
    if (this.props.inputRef) {
      this.props.inputRef(this.inputRef.current || null);
    }
  }
}

/** Get the index of an item element (or -1 if index was not found). */
function getListItemIndex(target: any): number {
  if (target instanceof Element || target instanceof HTMLElement) {
    return parseInt(target.getAttribute('data-dropdown-index') || '-1', 10);
  }
  return -1;
}

/** Check if two arrays are of equal length and contains the exact same items in the same order. */
function checkIfArraysAreEqual(a: Array<any>, b: Array<any>): boolean {
  if (a.length !== b.length) { return false; }
  for (let i = a.length; i >= 0; i--) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}
