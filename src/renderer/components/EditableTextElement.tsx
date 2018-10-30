import * as React from 'react';

export interface IEditableTextElementArgs {
  editing: boolean;
  text: string;
  startEdit: () => void;
  cancelEdit: () => void;
  confirmEdit: () => void;
  onInputChange: (event: React.ChangeEvent<{ value: string }>) => void;
  onInputKeyDown: (event: React.KeyboardEvent) => void;
}

export interface IEditableTextElementProps {
  children?: (args: IEditableTextElementArgs) => JSX.Element|void;

  onEditConfirm?: (text: string) => void;
  onEditCancel?: (text: string) => void;
  
  confirmKeys?: string[];
  cancelKeys?: string[];
  editable?: boolean;
  
  text: string;
}

export interface IEditableTextElementState {
  editing: boolean;
  text: string;
}

export class EditableTextElement extends React.Component<IEditableTextElementProps, IEditableTextElementState> {
  constructor(props: IEditableTextElementProps) {
    super(props);
    this.state = {
      editing: false,
      text: this.props.text,
    };
    this.startEdit = this.startEdit.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.confirmEdit = this.confirmEdit.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.onInputKeyDown = this.onInputKeyDown.bind(this);
  }

  render() {
    if (!this.props.children) { return (<></>); }
    return this.props.children({
      editing: this.state.editing,
      startEdit: this.startEdit,
      cancelEdit: this.cancelEdit,
      confirmEdit: this.confirmEdit,
      text: this.state.text,
      onInputChange: this.onInputChange,
      onInputKeyDown: this.onInputKeyDown,
    }) || (<></>);
  }

  componentDidUpdate(prevProps: IEditableTextElementProps, prevState: IEditableTextElementState) {
    // Stop editing if no longer editable
    if (!this.props.editable && this.state.editing) {
      this.setState({ editing: false });
    }
    // Update text while not editing
    if (!this.state.editing && this.state.text !== this.props.text) {
      this.setState({ text: this.props.text });
    }
  }

  private startEdit(): void {
    if (this.props.editable) {
      this.setState({ editing: true });
    }
  }

  private cancelEdit(): void {
    this.setState({ editing: false });
    this.props.onEditCancel && this.props.onEditCancel(this.state.text);
  }

  private confirmEdit(): void {
    this.setState({ editing: false });
    this.props.onEditConfirm && this.props.onEditConfirm(this.state.text);
  }

  private onInputChange(event: React.ChangeEvent<{ value: string }>): void {
    this.setState({ text: event.target.value });
  }

  private onInputKeyDown(event: React.KeyboardEvent): void {
    if (!this.state.editing) { return; }
    if (findKey(event.key, this.props.confirmKeys)) {
      this.props.onEditConfirm && this.props.onEditConfirm(this.state.text);
      this.setState({ editing: false });
    } else if (findKey(event.key, this.props.cancelKeys)) {
      this.props.onEditCancel && this.props.onEditCancel(this.state.text);
      this.setState({ editing: false });
    }
  }
}

function findKey(key: string, keys?: string[]): boolean {
  if (keys) {
    for (let i = keys.length - 1; i >= 0; i--) {
      if (key === keys[i]) { return true; }
    }
  }
  return false;
}
