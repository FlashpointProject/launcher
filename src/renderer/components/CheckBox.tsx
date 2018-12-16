import * as React from 'react';

export interface ICheckBoxProps {
  className?: string;
  style?: React.CSSProperties;
  /** If this is checked (defaults to false if undefined) */
  checked?: boolean;
  /** Called when this becomes checked or unchecked */
  onChange?: (isChecked: boolean) => void;
}

export class CheckBox extends React.Component<ICheckBoxProps, {}> {
  constructor(props: ICheckBoxProps) {
    super(props);
  }

  render() {
    return (
      <input type='checkbox' checked={this.props.checked} onChange={this.onChange}
             className={this.props.className} style={this.props.style} />
    );
  }

  onChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (this.props.onChange) { this.props.onChange(event.target.checked); }
  }
}
