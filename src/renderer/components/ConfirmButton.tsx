import * as React from 'react';

export interface ConfirmButtonPassthroughProps {
  value?: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export interface ConfirmButtonProps {
  /** Pass-through props that are always passed through */
  props?: ConfirmButtonPassthroughProps;
  /** Pass-through props that are passed while not confirming (overrides .props) */
  noConfirm?: ConfirmButtonPassthroughProps;
  /** Pass-through props that are passed while confirming (overrides .props) */
  confirm?: ConfirmButtonPassthroughProps;
  /** If the button should skip the confirmation step and trigger onConfirm after the first click (false by default) */
  skipConfirm?: boolean;
  /** Called when the button is clicked while confirming */
  onConfirm?: () => void;
}

export interface ConfirmButtonState {
  showConfirm: boolean;
}

export class ConfirmButton extends React.Component<ConfirmButtonProps, ConfirmButtonState> {
  constructor(props: ConfirmButtonProps) {
    super(props);
    this.state = {
      showConfirm: false,
    };
  }

  render() {
    let props: ConfirmButtonPassthroughProps = Object.assign({}, this.props.props);
    if (this.state.showConfirm) {
      Object.assign(props, this.props.confirm);
    } else {
      Object.assign(props, this.props.noConfirm);
    }
    return (
      <input type='button'
             onClick={this.onClick} 
             onMouseLeave={this.onMouseLeave} 
             {...props} />
    );
  }

  private onClick = (event: React.MouseEvent): void => {
    if (this.props.skipConfirm) {
      if (this.props.onConfirm) { this.props.onConfirm(); }
    } else {
      if (this.state.showConfirm) {
        if (this.props.onConfirm) { this.props.onConfirm(); }
        this.setState({ showConfirm: false });
      } else {
        this.setState({ showConfirm: true });
      }
    }
  }

  private onMouseLeave = (event: React.MouseEvent): void => {
    if (this.state.showConfirm) {
      this.setState({ showConfirm: false });
    }
  }
}
