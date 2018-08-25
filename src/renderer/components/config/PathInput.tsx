import * as React from 'react';

export interface IPathInputProps {
  /** Default value of the file path input element */
  defaultInput?: string;
}

export interface IPathInputState {
  input: string;
}

export class PathInput extends React.Component<IPathInputProps, IPathInputState> {
  constructor(props: IPathInputProps) {
    super(props);
    this.state = {
      input: this.props.defaultInput || '',
    }
    this.onInputChange = this.onInputChange.bind(this);
    this.onBrowseClick = this.onBrowseClick.bind(this);
  }

  render() {
    return (
      <>
        <input value={this.state.input} onChange={this.onInputChange} />
        <input type="button" value="Browse" onClick={this.onBrowseClick} />
      </>
    );
  }

  onInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ input: cleanFilePath(event.target.value) });
  }

  onBrowseClick(event: React.MouseEvent<HTMLInputElement>): void {
    window.External.showOpenDialog({
      title: 'Get outta here',
      defaultPath: 'C:/',
      properties: ['openDirectory'],
    }, (filePaths, bookmarks) => {
      if (filePaths) {
        this.setState({ input: cleanFilePath(filePaths[0]) })
      }
    });
  }
}

function cleanFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
