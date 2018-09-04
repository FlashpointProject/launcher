import * as React from 'react';

export interface IEditableTextProps {
  /** Text to show (while not editing and the default when editing) */
  text: string;
  /** If the text is in "edit mode" */
  isEditing?: boolean;
  /** When the "edit text" is changed */
  onTextChange?: (text: string) => void;
  /**  */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** When the normal text is clicked (this is NOT in edit mode) */
  onTextClick?: (event: React.MouseEvent<HTMLParagraphElement>) => void;
  /** When this edit text is clicked (this is in edit mode) */
  onEditClick?: (event: React.MouseEvent<HTMLInputElement>) => void;
  /** When the edit is complete */
  onEditDone?: (text: string) => void;
}

export interface IEditableTextState {
  /** Text to edit */
  editText: string;
}

export class EditableText extends React.Component<IEditableTextProps, IEditableTextState> {
  /** Reference to the edit input element (if in editing mode) */
  private _edit: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IEditableTextProps) {
    super(props);
    this.state = {
      editText: props.text,
    };
    this.onInputChange = this.onInputChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    this.checkEditStart(!!this.props.isEditing, false);
  }

  componentDidUpdate(prevProps: IEditableTextProps): void {
    const isEditing: boolean = !!this.props.isEditing;
    const wasEditing: boolean = !!prevProps.isEditing;
    this.checkEditEnd(isEditing, wasEditing);
    this.checkEditStart(isEditing, wasEditing);
  }

  render() {
    return (
      this.props.isEditing ? (
        <input value={this.state.editText} onChange={this.onInputChange} onClick={this.props.onEditClick}
               onKeyDown={this.onKeyDown} ref={this._edit} />
      ) : (
        <p onClick={this.props.onTextClick}>
          {this.props.text}
        </p>
      )
    );
  }

  /** Focus the edit input field (if editing) */
  public focus() {
    if (this._edit.current) {
      this._edit.current.focus();
    }
  }

  onInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ editText: event.target.value });
  }

  onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (this.props.onKeyDown) {
      this.props.onKeyDown(event);
    }
  }

  /** Check if it has started editing */
  checkEditStart(isEditing: boolean, wasEditing: boolean): void {
    if (isEditing && !wasEditing) {
      this.setState({ editText: this.props.text });
    }
  }

  /** Check if it has ended editing */
  checkEditEnd(isEditing: boolean, wasEditing: boolean): void {
    if (!isEditing && wasEditing) {
      if (this.props.onEditDone) { this.props.onEditDone(this.state.editText); }
    }
  }
}
