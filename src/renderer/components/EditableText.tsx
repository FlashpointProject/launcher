import * as React from 'react';

/** Props that are the same across both the text and edit elements */
export interface IEditableTextBaseProps {
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

/** Props for the edit element (used when in edit mode) */
export interface IEditableTextTextProps extends IEditableTextBaseProps {
}

/** Props for the text element (used when NOT in edit mode) */
export interface IEditableTextEditProps extends IEditableTextBaseProps{
  width?: number;
  height?: number;
}

export interface IEditableTextProps {
  /** Text to show (while not editing and the default when editing) */
  text: string;
  /** Placeholder text to show while no text is entered */
  placeholder?: string;
  /** If the text is in "edit mode" */
  isEditing?: boolean;
  /** If the edit text field is multiline (its single line by default) */
  isMultiline?: boolean;
  /** When the "edit text" is changed */
  onTextChange?: (text: string) => void;
  /** When a key is pressed down while in edit mode (if edit element has focus) */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** When the normal text is clicked (this is NOT in edit mode) */
  onTextClick?: (event: React.MouseEvent) => void;
  /** When this edit text is clicked (this is in edit mode) */
  onEditClick?: (event: React.MouseEvent) => void;
  /** When the edit is complete */
  onEditDone?: (text: string) => void;
  /** Props to forward to the text element (when not editing) */
  textProps?: IEditableTextTextProps;
  /** Props to forward to the edit element (when editing) */
  editProps?: IEditableTextEditProps;
}

export interface IEditableTextState {
  /** Text to edit */
  editText: string;
}

export class EditableText extends React.Component<IEditableTextProps, IEditableTextState> {
  /** Reference to the edit input element (if in editing mode) */
  private _edit: React.RefObject<any> = React.createRef();

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
        this.props.isMultiline ? ( // Multi-line edit
          <textarea value={this.state.editText} placeholder={this.props.placeholder}
                    onChange={this.onInputChange} onClick={this.props.onEditClick}
                    onKeyDown={this.onKeyDown} ref={this._edit} {...this.props.editProps} />
        ) : ( // Single-line edit
          <input value={this.state.editText} placeholder={this.props.placeholder}
                 onChange={this.onInputChange} onClick={this.props.onEditClick}
                 onKeyDown={this.onKeyDown} ref={this._edit} {...this.props.editProps} />
        )
      ) : ( // Normal text
        <p onClick={this.props.onTextClick} {...this.props.textProps}>
          {this.props.text || this.props.placeholder}
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

  onInputChange(event: React.ChangeEvent<{ value: string; }>): void {
    this.setState({ editText: event.target.value });
  }

  onKeyDown(event: React.KeyboardEvent): void {
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
