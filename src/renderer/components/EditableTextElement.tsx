import * as React from 'react';

export type EditableTextElementArgs = {
  /** If this is in "edit mode" (instead of "view mode"). */
  editing: boolean;
  /** Current text. */
  text: string;
  /** Enter "edit mode". */
  startEdit: () => void;
  /** Leave "edit mode" and discard the edited text. */
  cancelEdit: () => void;
  /** Leave "edit mode" and "lock in" the edited text. */
  confirmEdit: () => void;
  /** Call this whenever the input is changed (while in "edit mode"). */
  onInputChange: (event: React.ChangeEvent<{ value: string }>) => void;
  /** Call this whenever a key is pressed (while in "edit mode" and the text element is receiving the input). */
  onInputKeyDown: (event: React.KeyboardEvent) => void;
};

export type EditableTextElementKeyArgs = {
  /** Keyboard event. */
  event: React.KeyboardEvent;
  /** Cancel edit (discard changes). */
  cancel: () => void;
  /** Confirm edit ("lock in" changes). */
  confirm: () => void;
};

export type EditableTextElementProps = {
  /** Function that renders the text element (render prop). */
  children?: (args: EditableTextElementArgs) => JSX.Element|void;
  /** Called when editing is confirmed (when the user is done editing and attempts to "lock in" the edited text). */
  onEditConfirm?: (text: string) => void;
  /** Called when editing is cancelled (when the user is done editing and attempts to discard the edited text). */
  onEditCancel?: (text: string) => void;
  /** Called when a key is pushed down while editing (called from the render prop argument "onInputKeyDown"). */
  onEditKeyDown?: (args: EditableTextElementKeyArgs) => void;
  /** If the element is editable (if it can enter "edit mode"). */
  editable?: boolean;
  /** Text to be displayed (and to edit when it enters "edit mode"). */
  text: string;
};

type EditableTextElementState = {
  /** If this is in "edit mode" (instead of "view mode"). */
  editing: boolean;
  /** Current text. */
  text: string;
};

/**
 * A "render prop" component that stores and manages state for an editable text field.
 * Note that this is an old component that should probably be replaced with something nicer.
 */
export class EditableTextElement extends React.Component<EditableTextElementProps, EditableTextElementState> {
  constructor(props: EditableTextElementProps) {
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

  componentDidUpdate() {
    // Stop editing if no longer editable
    if (!this.props.editable && this.state.editing) {
      this.setState({ editing: false });
    }
    // Update text while not editing
    if (!this.state.editing && this.state.text !== this.props.text) {
      this.setState({ text: this.props.text });
    }
  }

  startEdit = (): void => {
    if (this.props.editable) {
      this.setState({ editing: true });
    }
  }

  cancelEdit = (): void => {
    this.setState({ editing: false });
    this.props.onEditCancel && this.props.onEditCancel(this.state.text);
  }

  confirmEdit = (): void => {
    this.setState({ editing: false });
    this.props.onEditConfirm && this.props.onEditConfirm(this.state.text);
  }

  onInputChange = (event: React.ChangeEvent<{ value: string }>): void => {
    this.setState({ text: event.target.value });
  }

  onInputKeyDown = (event: React.KeyboardEvent): void => {
    if (this.state.editing) {
      const func = this.props.onEditKeyDown || EditableTextElement.onEditKeyDown;
      func({
        event,
        cancel: this.cancelEdit,
        confirm: this.confirmEdit,
      });
    }
  }

  public static onEditKeyDown({ event, cancel, confirm }: EditableTextElementKeyArgs): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      confirm();
    } else if (event.key === 'Escape') {
      cancel();
    }
  }
}
