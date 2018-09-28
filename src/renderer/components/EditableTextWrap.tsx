import * as React from 'react';
import { EditableText, IEditableTextEditProps, IEditableTextTextProps } from './EditableText';

export interface IEditableTextWrapProps {
  /** Text to show (while not editing and the default when editing) */
  text: string;
  /** Placeholder text to show while no text is entered */
  placeholder?: string;
  /** If the edit text field is multiline (its single line by default) */
  isMultiline?: boolean;
  /** Props to forward to the text element (when not editing) */
  textProps?: IEditableTextTextProps;
  /** Props to forward to the edit element (when editing) */
  editProps?: IEditableTextEditProps;
  /** When the edit is complete */
  onEditDone?: (text: string) => void;
  /** When the value of this is changed, this component's state is "reset" */
  target?: any;
  /** If the editing is disabled (it cant go into "edit mode") */
  editDisabled?: boolean;
}

export interface IEditableTextWrapState {
  /** If the text is in "edit mode" */
  isEditing: boolean;
}

export class EditableTextWrap extends React.Component<IEditableTextWrapProps, IEditableTextWrapState> {
  /** Reference to component this is a wrapper for */
  private _text: React.RefObject<EditableText> = React.createRef();
  /** If this was clicked the previous update */
  private _wasClicked: boolean = false;
  
  constructor(props: IEditableTextWrapProps) {
    super(props);
    this.state = {
      isEditing: false,
    };
    this.onTextClick = this.onTextClick.bind(this);
    this.onEditKeyDown = this.onEditKeyDown.bind(this);
  }

  componentDidUpdate(prevProps: IEditableTextWrapProps): void {
    // Focus edit input element if this was clicked
    if (this._wasClicked) {
      this._wasClicked = false;
      if (this._text.current) { this._text.current.focus(); }
    }
    // End editing if the "target" was changed
    if (prevProps.target !== this.props.target) {
      this.setState({ isEditing: false });
    }
    // End editing if it was disabled
    if (this.state.isEditing && this.props.editDisabled && !prevProps.editDisabled) {
      this.setState({ isEditing: false });
    }
  }

  render() {
    return (
      <EditableText text={this.props.text} placeholder={this.props.placeholder}
                    isEditing={this.state.isEditing} isMultiline={this.props.isMultiline}
                    onTextClick={this.onTextClick} onKeyDown={this.onEditKeyDown}
                    textProps={this.props.textProps} editProps={this.props.editProps}
                    ref={this._text} />
    );
  }
  
  onTextClick(event: React.MouseEvent): void {
    if (!this.props.editDisabled && !this.state.isEditing) {
      this.setState({ isEditing: true });
      this._wasClicked = true;
    }
  }

  onEditKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { // (Allow shift + enter to make a new line)
      this.setState({ isEditing: false });
      if (this.props.onEditDone) {
        if (!this._text.current) { throw new Error('EditableText ref doeesnt point at a Component.'); }
        this.props.onEditDone(this._text.current.state.editText);
      }
    }
  }
}
