import * as React from 'react';

/** Partial set of the props for <input>. */
export type ConfirmButtonPassthroughProps = {
  value?: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

export type ConfirmButtonProps = {
  /** Props that are always passed through to the input element. */
  props?: ConfirmButtonPassthroughProps;
  /** Props that are passed through to the input element wile NOT confirming (this overrides "props"). */
  noConfirm?: ConfirmButtonPassthroughProps;
  /** Props that are passed through to the input element wile confirming (this overrides "props"). */
  confirm?: ConfirmButtonPassthroughProps;
  /** If the button should skip the "confirmation step" and call "onConfirm" at the first click (false by default). */
  skipConfirm?: boolean;
  /** Called when the button is clicked twice without having the cursor leave the button (or just once if "skipConfirm" is true). */
  onConfirm?: () => void;
};

type ConfirmButtonState = {
  showConfirm: boolean;
};

/** A button that requires two clicks to "activate", instead of one. */
export class ConfirmButton extends React.Component<ConfirmButtonProps, ConfirmButtonState> {
  constructor(props: ConfirmButtonProps) {
    super(props);
    this.state = {
      showConfirm: false,
    };
  }

  render() {
    const props = Object.assign({}, this.props.props);
    if (this.state.showConfirm) {
      Object.assign(props, this.props.confirm);
    } else {
      Object.assign(props, this.props.noConfirm);
    }
    return (
      <input
        type='button'
        onClick={this.onClick}
        onMouseLeave={this.onMouseLeave}
        { ...props } />
    );
  }

  onClick = (): void => {
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

  onMouseLeave = (): void => {
    if (this.state.showConfirm) {
      this.setState({ showConfirm: false });
    }
  }
}
