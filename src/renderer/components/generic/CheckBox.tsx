import * as React from 'react';

export interface ICheckBoxProps {
  /** If this is checked (defaults to false if undefined) */
  checked?: boolean;
  /** Called when this becomes checked or unchecked */
  onChange?: (isChecked: boolean) => void;
}

export class CheckBox extends React.Component<ICheckBoxProps, {}> {
  constructor(props: ICheckBoxProps) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  render() {
    return (
      <input type="checkbox" checked={this.props.checked} onChange={this.onChange} />
    );
  }

  onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    console.log('onChange', event.target.checked);
    if (this.props.onChange) { this.props.onChange(event.target.checked); }
  }
}
