import * as React from 'react';
import { EditableText } from './EditableText';

export interface IEditableTextWrapProps {
  /** Text to show (while not editing and the default when editing) */
  text: string;
  /** Style to forward to the text element (when not editing) */
  textStyle?: React.CSSProperties;
  /** Style to forward to the edit element (when editing) */
  editStyle?: React.CSSProperties;
  /** When the edit is complete */
  onEditDone?: (text: string) => void;
  /** When the value of this is changed, this component's state is "reset" */
  target?: any;
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
  }

  render() {
    return (
      <EditableText text={this.props.text} isEditing={this.state.isEditing} 
                    onTextClick={this.onTextClick} onKeyDown={this.onEditKeyDown} 
                    ref={this._text} />
    );
  }
  
  onTextClick(event: React.MouseEvent<HTMLParagraphElement>): void {
    if (!this.state.isEditing) {
      this.setState({ isEditing: true });
      this._wasClicked = true;
    }
  }

  onEditKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.setState({ isEditing: false });
      if (this.props.onEditDone) {
        if (!this._text.current) { throw new Error('EditableText ref doeesnt point at a Component.'); }
        this.props.onEditDone(this._text.current.state.editText);
      }
    }
  }
}
