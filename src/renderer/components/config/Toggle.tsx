import * as React from 'react';

export interface IToggleProps {
  /** If the checkbox is checked */
  checked?: boolean;
  /** Called when the checkbox becomes (un)checked */
  onChange?: (isChecked: boolean) => void;
}

export class Toggle extends React.Component<IToggleProps, {}> {
  constructor(props: IToggleProps) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  render() {
    return (
      <input type="checkbox" checked={this.props.checked} onChange={this.onChange} />
    );
  }

  onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    if (this.props.onChange) { this.props.onChange(event.target.checked); }
  }
}
