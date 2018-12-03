import * as React from 'react';

export interface IDropdownProps {
  /** Text to show on the button */
  text: string;
}

export interface IDropdownState {
  expanded: boolean;
}

export class Dropdown extends React.Component<IDropdownProps, IDropdownState> {
  constructor(props: IDropdownProps) {
    super(props);
    this.state = {
      expanded: false,
    };
    this.onBoxClick = this.onBoxClick.bind(this);
  }

  render() {
    const { text, children } = this.props;
    const { expanded } = this.state;
    return (
      <div className='checkbox-dropdown'>
        <div className='checkbox-dropdown__select-box' onClick={this.onBoxClick}
             tabIndex={0}>
          {text}
        </div>
        <div className={'checkbox-dropdown__check-boxes' + 
                        (expanded?'':' checkbox-dropdown__check-boxes--hidden')}>
          { children }
        </div>
      </div>
    );
  }

  onBoxClick(): void {
    this.setState({ expanded: !this.state.expanded });
  }
}
