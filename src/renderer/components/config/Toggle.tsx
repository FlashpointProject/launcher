import * as React from 'react';

export interface IToggleProps {
  /** Default value of the checkbox */
  defaultChecked?: boolean;
  /** When the checkbox is checked or unchecked */
  onChange?: (isChecked: boolean) => void;
}

export interface IToggleState {
  isChecked: boolean;
}

export class Toggle extends React.Component<IToggleProps, IToggleState> {
  constructor(props: IToggleProps) {
    super(props);
    this.state = {
      isChecked: !!this.props.defaultChecked,
    }
    this.onChange = this.onChange.bind(this);
  }

  render() {
    return (
      <input type="checkbox" checked={this.state.isChecked} onChange={this.onChange} />
    );
  }

  onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const isChecked: boolean = event.target.checked;
    this.setState({ isChecked: isChecked });
    if (this.props.onChange) { this.props.onChange(isChecked); }
  }
}
