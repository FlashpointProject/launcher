import * as React from 'react';

type FloatingContainerProps = {
  children: JSX.Element | JSX.Element[];
  onClick?: () => void;
} & React.HTMLProps<HTMLDivElement>;

export class FloatingContainer extends React.Component<FloatingContainerProps> {
  render() {
    return (
      <div className='floating-container__wrapper'
        { ...this.props }
        onClick={this.props.onClick}>
        <div className='floating-container'>
          {this.props.children}
        </div>
      </div>
    );
  }
}
