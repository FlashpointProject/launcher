import * as React from 'react';

type FloatingContainerProps = {
  children: JSX.Element | JSX.Element[];
  onClick?: () => void;
}

export class FloatingContainer extends React.Component<FloatingContainerProps> {
  render() {
    return (
      <div className='floating-container__wrapper'
        onClick={this.props.onClick}>
        <div className='floating-container'>
          {this.props.children}
        </div>
      </div>
    );
  }
}
