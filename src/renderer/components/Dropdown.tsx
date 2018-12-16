import * as React from 'react';

export interface IDropdownProps {
  /** Text to show on the button */
  text: string;
}

export interface IDropdownState {
  expanded: boolean;
}

export class Dropdown extends React.Component<IDropdownProps, IDropdownState> {
  private contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: IDropdownProps) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.onGlobalMouseDown);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onGlobalMouseDown);
  }

  render() {
    const { text, children } = this.props;
    const { expanded } = this.state;
    return (
      <div className='checkbox-dropdown'>
        <div className='checkbox-dropdown__select-box' onMouseDown={this.onBoxMouseDown}
             tabIndex={0}>
          {text}
        </div>
        <div className={'checkbox-dropdown__content' +  (expanded?'':' checkbox-dropdown__content--hidden')}
             ref={this.contentRef}>
          { children }
        </div>
      </div>
    );
  }

  onBoxMouseDown = (event: React.MouseEvent): void => {
    if (event.button === 0) {
      this.setState({ expanded: !this.state.expanded });
      event.preventDefault();
    }
  }

  onGlobalMouseDown = (event: MouseEvent) => {
    if (this.state.expanded && !event.defaultPrevented) {
      if (!checkIfAncestor(event.target as HTMLElement|null, this.contentRef.current)) {
        this.setState({ expanded: false });
      }
    }
  }
}

/** Check if an element is the ancestor of another element */
function checkIfAncestor(start: HTMLElement|null, target: HTMLElement|null): boolean {
  let element: HTMLElement|null = start;
  while (element) {
    if (element === target) { return true; }
    element = element.parentElement;
  }
  return false;
}
