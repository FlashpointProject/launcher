import * as React from 'react';

export interface IConfirmElementArgs {
  /** Number of times this has been activated since the last reset. */
  activationCounter: number;
  /** Increments "activationCounter" then fires "onConfirm" if the counter exceeds "activationLimit". */
  activate: () => void;
  /** Calls the "onConfirm" callback (does not change or reset "activationCounter") */
  confirm: () => void;
  /** Resets "activationCounter". */
  reset: () => void;
}

export interface IConfirmElementProps {
  children?: (args: IConfirmElementArgs) => JSX.Element|void;
  activationLimit?: number;
  onConfirm?: () => void;
}

export interface IConfirmButtonState {
  activationCounter: number;
}

export class ConfirmElement extends React.Component<IConfirmElementProps, IConfirmButtonState> {
  constructor(props: IConfirmElementProps) {
    super(props);
    this.state = {
      activationCounter: 0,
    };
    this.activate = this.activate.bind(this);
    this.confirm = this.confirm.bind(this);
    this.reset = this.reset.bind(this);
  }

  render() {
    if (!this.props.children) { return (<></>); }
    return this.props.children({
      activationCounter: this.state.activationCounter,
      activate: this.activate,
      reset: this.reset,
      confirm: this.confirm,
    }) || (<></>);
  }

  private activate(): void {
    let limit = (this.props.activationLimit !== undefined) ? this.props.activationLimit : 1;
    let nextCount = this.state.activationCounter + 1;
    if (nextCount > limit) {
      this.confirm();
      this.reset();
    } else {
      this.setState({ activationCounter: nextCount });
    }
  }

  private confirm(): void {
    if (this.props.onConfirm) {
      this.props.onConfirm();
    }
  }

  private reset(): void {
    if (this.state.activationCounter !== 0) {
      this.setState({ activationCounter: 0 });
    }
  }
}
