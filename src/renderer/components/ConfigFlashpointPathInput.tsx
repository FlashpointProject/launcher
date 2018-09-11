import * as React from 'react';

export interface IConfigFlashpointPathInputProps {
  /** Value of the input field */
  input?: string;
  /** If the current input is valid */
  isValid?: boolean;
  /** Called when the input is changed */
  onInputChange?: (input: string) => void;
}

export class ConfigFlashpointPathInput extends React.Component<IConfigFlashpointPathInputProps, {}> {
  constructor(props: IConfigFlashpointPathInputProps) {
    super(props);
    this.onInputChange = this.onInputChange.bind(this);
    this.onBrowseClick = this.onBrowseClick.bind(this);
    if (props.onInputChange) { props.onInputChange(this.props.input || ''); }
  }

  render() {
    const isValid = this.props.isValid;
    let className: string = 'flashpoint-path__input';
    if (isValid !== undefined) {
      className += isValid ? ' flashpoint-path__input--valid' : ' flashpoint-path__input--invalid';
    }
    return (
      <>
        <div className={className}>
          <input type="text" onChange={this.onInputChange} value={this.props.input} />
        </div>
        <input type="button" value="Browse" className="simple-button" onClick={this.onBrowseClick} />
      </>
    );
  }

  onInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setInput(event.target.value);
  }

  onBrowseClick(event: React.MouseEvent<HTMLInputElement>): void {
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialog({
      title: 'Select the FlashPoint root directory',
      properties: ['openDirectory'],
    });
    if (filePaths) {
      this.setInput(filePaths[0]);
    }
  }

  setInput(input: string): void {
    if (this.props.onInputChange) { this.props.onInputChange(input || ''); }
  }
}
