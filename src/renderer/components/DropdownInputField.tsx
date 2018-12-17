import * as React from 'react';
import { InputField, InputFieldProps } from './InputField';

type InputElement = HTMLInputElement|HTMLTextAreaElement;

export interface DropdownInputFieldProps extends InputFieldProps {
  /** If this can be edited or not (if not true, it will be shown as a normal text element) */
  canEdit?: boolean;
  /** Items to show in the list */
  items: string[];
  /** Called when a list item is clicked or otherwise "selected" */
  onItemSelect?: (index: number, text: string) => void;
}

interface DropdownInputFieldState {
  expanded: boolean;
}

export class DropdownInputField extends React.Component<DropdownInputFieldProps, DropdownInputFieldState> {
  private rootRef: React.RefObject<HTMLDivElement> = React.createRef();
  private contentRef: React.RefObject<HTMLDivElement> = React.createRef();
  private inputRef: React.RefObject<any> = React.createRef();

  constructor(props: DropdownInputFieldProps) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.onGlobalMouseDown);
    document.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onGlobalMouseDown);
    document.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  render() {
    const { items, className, canEdit } = this.props;
    const { expanded } = this.state;
    const inputField = (
      <InputField { ...this.props }
        className={className+' input-dropdown__input-field__input__inner'}
        onChange={this.onInputChange}
        onKeyDown={this.onInputKeyDown}
        reference={this.inputRef} />
    );
    if (canEdit) {
      return (
        <div className='input-dropdown' ref={this.rootRef} onBlur={this.onBlur}>
          <div className='input-dropdown__input-field'>
            <input className='input-dropdown__input-field__back' tabIndex={-1} readOnly={true} />
            <div className='input-dropdown__input-field__input'>
              { inputField }
            </div>
            <div className='input-dropdown__input-field__button'
                 onMouseDown={this.onExpandButtonMouseDown} />
          </div>
          <div className={'input-dropdown__content' +  (expanded?'':' input-dropdown__content--hidden')}
               ref={this.contentRef}>
            { items.map((text, index) => (
              <label key={index} tabIndex={0}
                     onClick={() => this.onListItemClick(index)}
                     onKeyDown={(e) => this.onListItemKeyDown(index, e)}>
                <div className='simple-center'>
                  <p>{text}</p>
                </div>
              </label>
            )) }
          </div>
        </div>
      );      
    } else {
      return inputField;
    }
  }

  onBoxMouseDown = (event: React.MouseEvent): void => {
    if (event.button === 0) {
      this.setState({ expanded: !this.state.expanded });
      event.preventDefault();
    }
  }

  onGlobalMouseDown = (event: MouseEvent) => {
    if (this.state.expanded && !event.defaultPrevented) {
      if (!checkIfAncestor(event.target as Element|null, this.rootRef.current)) {
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

  onListItemClick = (index: number): void => {
    this.setState({ expanded: false });
    if (this.props.onItemSelect) { this.props.onItemSelect(index, this.props.items[index]); }
  }

  onListItemKeyDown = (index: number, event: React.KeyboardEvent): void => {
    const { key } = event;
    // Select the focused list item
    if (this.props.onItemSelect && (key === 'Enter' || key === ' ')) {
      this.props.onItemSelect(index, this.props.items[index]);
      this.setState({ expanded: false });
      // Focus the input element
      const input = this.inputRef.current;
      if (input && input.focus) { input.focus(); }
    }
    // Move focus up or down
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const element = document.activeElement;
      if (element && checkIfAncestor(element, this.contentRef.current)) {
        const next: any = (key === 'ArrowUp') ? element.previousSibling :
                                                element.nextElementSibling;
        if (next && next.focus) { next.focus(); }
      }
    } else {
      if (!this.state.expanded) { this.setState({ expanded: true }); }
    }
  }

  onBlur = (event: React.FocusEvent): void => {
    const { relatedTarget } = event;
    if (relatedTarget && !checkIfAncestor(relatedTarget as any, this.rootRef.current)) {
      this.setState({ expanded: false });
    }
  }

  onInputChange = (event: React.ChangeEvent<InputElement>): void => {
    if (!this.state.expanded) { this.setState({ expanded: true }); }
    if (this.props.onChange) { this.props.onChange(event); }
  }

  onInputKeyDown = (event: React.KeyboardEvent<InputElement>): void => {
    const { key } = event;
    // Focus the first or last item, also expand the content container
    if (key === 'ArrowUp' || key === 'ArrowDown') {
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

  onExpandButtonMouseDown = (): void => {
    this.setState({ expanded: !this.state.expanded });
  }
}

/** Check if an element is the ancestor of another element */
function checkIfAncestor(start: Element|null, target: Element|null): boolean {
  let element: Element|null = start;
  while (element) {
    if (element === target) { return true; }
    element = element.parentElement;
  }
  return false;
}
