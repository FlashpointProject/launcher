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

export interface IEditableTextElementKeyArgs {
  event: React.KeyboardEvent;
  /** Cancel edit */
  cancel: () => void;
  /** Confirm edit */
  confirm: () => void;
}

export interface IEditableTextElementProps {
  /** Function that renders the editable text */
  children?: (args: IEditableTextElementArgs) => JSX.Element|void;
  /** Called when editing is confirmed */
  onEditConfirm?: (text: string) => void;
  /** Called when editing is cancelled */
  onEditCancel?: (text: string) => void;
  /** Called when a key is pushed down while editing */
  onEditKeyDown?: (args: IEditableTextElementKeyArgs) => void;
  /** If the element is editable (if it can go to the "edit mode") */
  editable?: boolean;
  /** Text to be displayed (and to edit when it goes into "edit mode") */
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

  private startEdit = (): void => {
    if (this.props.editable) {
      this.setState({ editing: true });
    }
  }

  private cancelEdit = (): void => {
    this.setState({ editing: false });
    this.props.onEditCancel && this.props.onEditCancel(this.state.text);
  }

  private confirmEdit = (): void => {
    this.setState({ editing: false });
    this.props.onEditConfirm && this.props.onEditConfirm(this.state.text);
  }

  private onInputChange = (event: React.ChangeEvent<{ value: string }>): void => {
    this.setState({ text: event.target.value });
  }

  private onInputKeyDown = (event: React.KeyboardEvent): void => {
    if (!this.state.editing) { return; }
    const func = this.props.onEditKeyDown || EditableTextElement.onEditKeyDown;
    func({
      event,
      cancel: this.cancelEdit,
      confirm: this.confirmEdit,
    });
  }

  public static onEditKeyDown({ event, cancel, confirm }: IEditableTextElementKeyArgs): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      confirm();
    } else if (event.key === 'Escape') {
      cancel();
    }
  }
}
