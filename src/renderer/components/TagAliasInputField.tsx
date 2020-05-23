import { TagAlias } from '@database/entity/TagAlias';
import { LangContext } from '@renderer/util/lang';
import { LangContainer } from '@shared/lang';
import * as React from 'react';
import { checkIfAncestor } from '../Util';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { InputField, InputFieldProps } from './InputField';
import { OpenIcon } from './OpenIcon';

/** A function that receives a HTML element (or null). */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

/** Input element types used by this component. */
type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type TagAliasInputFieldProps = InputFieldProps & {
  /** Id of the primary alias */
  primaryAliasId?: number;
  /** Items to display in the drop-down list. */
  aliases: TagAlias[];
  /** Called when a tag is selected for primary */
  onTagAliasSelect?: (tagAlias: TagAlias, index: number) => void;
  /** Called when a tag alias is deleted */
  onTagAliasDelete?: (tagAlias: TagAlias, index: number) => void;
  /** Called when the tag input box is submitted */
  onTagAliasSubmit?: (text: string) => void;
  /** Function for getting a reference to the input element. Called whenever the reference could change. */
  inputRef?: RefFunc<InputElement>;
};

type TagAliasInputFieldState = {

};

export interface TagAliasInputField {
  context: LangContainer;
}

/** An input element with a drop-down menu that can list any number of selectable and clickable text elements. */
export class TagAliasInputField extends React.Component<TagAliasInputFieldProps, TagAliasInputFieldState> {
  rootRef: React.RefObject<HTMLDivElement> = React.createRef();
  contentRef: React.RefObject<HTMLDivElement> = React.createRef();
  inputRef: React.RefObject<InputElement> = React.createRef();

  constructor(props: TagAliasInputFieldProps) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.updatePropRefs();
  }

  componentDidUpdate() {
    this.updatePropRefs();
  }

  componentWillUnmount() {
    this.updatePropRefs();
  }

  render() {
    const { aliases, className, editable, text } = this.props;
    // Render input field
    const inputField = (
      <InputField
        { ...this.props }
        text={text}
        className={(className || '') + ' input-dropdown__input-field__input__inner'}
        onChange={this.onInputChange}
        onKeyDown={this.onInputKeyDown}
        reference={this.inputRef} />
    );
    // Render
    return (
      <div
        className={'input-dropdown' + (this.props.disabled ? ' input-dropdown--disabled' : '')}
        ref={this.rootRef}
        onBlur={this.onBlur}>
        { editable ? inputField : undefined }
        <div
          className={'tag-input-dropdown__content'}
          onClick={this.onListItemClick}
          onKeyDown={this.onListItemKeyDown}
          ref={this.contentRef}>
          { this.renderItems(aliases) }
        </div>
      </div>
    );
  }

  /** Renders the list of items in the drop-down menu. */
  renderItems = (items: TagAlias[]) => {
    const baseClassName = this.props.editable ? 'tag-alias-editable ' : '';
    return items.map((tagAlias, index) => {
      const className = baseClassName + (tagAlias.id == this.props.primaryAliasId ? 'tag-primary' : '');
      return (
        <div className={'tag-alias-wrapper ' + baseClassName}
          key={index}>
          <OpenIcon
            className='tag-icon'
            icon='arrow-right' />
          <div className={'tag-alias ' + className} key={index}>
            <label
              className='tag-alias-label'
              title={tagAlias.name}
              key={index * 2 + 1}
              data-dropdown-index={index}
              tabIndex={0}>
              { tagAlias.name }
            </label>
            { tagAlias.id == this.props.primaryAliasId ? (
              <p className={'tag-primary__right'} >
                Primary
              </p>
            ): undefined }
            { this.props.editable && tagAlias.id != this.props.primaryAliasId ? (
              <div className='tag-alias__buttons'>
                <div
                  className='tag-alias__buttons-primary'
                  title={this.context.tags.setPrimaryAlias}
                  onClick={() => this.onPrimaryAliasClick(tagAlias, index)}>
                  <OpenIcon icon='check' />
                </div>
                <ConfirmElement
                  onConfirm={() => this.onDeleteAliasClick(tagAlias, index)}
                  children={this.renderDeleteButton}
                  extra={this.context.tags} />
              </div>
            ) : undefined }
          </div>
        </div>
      );
    });
  }

  onPrimaryAliasClick = (tagAlias: TagAlias, index: number) => {
    if (this.props.onTagAliasSelect) {
      this.props.onTagAliasSelect(tagAlias, index);
    }
  }

  onDeleteAliasClick = (tagAlias: TagAlias, index: number) => {
    if (this.props.onTagAliasDelete) {
      this.props.onTagAliasDelete(tagAlias, index);
    }
  }

  renderPrimaryButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['tags']>): JSX.Element {
    const className = 'tag-alias__buttons-primary';
    return (
      <div
        className={className + ((activationCounter > 0) ? ` ${className}--active simple-vertical-shake` : '')}
        title={extra.setPrimaryAlias}
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='check' />
      </div>
    );
  }

  renderDeleteButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['tags']>): JSX.Element {
    const className = 'tag-alias__buttons-delete';
    return (
      <div
        className={className + ((activationCounter > 0) ? ` ${className}--active simple-vertical-shake` : '')}
        title={extra.deleteTagAlias}
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='trash' />
      </div>
    );
  }

  onListItemClick = (event: React.MouseEvent): void => {
    if (!this.props.disabled) {
      if (!this.props.editable) {
        if (this.props.onTagAliasSelect) {
          const index = getListItemIndex(event.target);
          if (index >= 0) {
            this.props.onTagAliasSelect(this.props.aliases[index], index);
          }
        }
      }
    }
  }

  onListItemKeyDown = (event: React.KeyboardEvent): void => {
    if (!this.props.disabled) {
      const { key, target } = event;
      // Select the focused list item
      if (this.props.onTagAliasSelect && (key === 'Enter' || key === ' ')) {
        const index = getListItemIndex(target);
        if (index >= 0) {
          this.props.onTagAliasSelect(this.props.aliases[index], index);
          // Focus the input element
          const input = this.inputRef.current;
          if (input && input.focus) { input.focus(); }
        }
      }
      // Move focus up or down
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        const element = document.activeElement;
        if (element && checkIfAncestor(element, this.contentRef.current)) {
          const next: any = (key === 'ArrowUp') ? element.previousSibling :
                                                  element.nextElementSibling;
          if (next && next.focus) {
            next.focus();
            event.preventDefault();
          }
        }
      }
    }
  }

  onBlur = (event: React.FocusEvent): void => {
    const { relatedTarget } = event;
  }

  onInputChange = (event: React.ChangeEvent<InputElement>): void => {
    if (!this.props.disabled) {
      if (this.props.onChange) { this.props.onChange(event); }
    }
  }

  onInputKeyDown = (event: React.KeyboardEvent<InputElement>): void => {
    if (!this.props.disabled) {
      const { key } = event;
      if (key === 'Enter' && this.props.onTagAliasSubmit) {
        this.props.onTagAliasSubmit(this.props.text);
      }
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        // Focus the first or last item
        event.preventDefault();
        const content = this.contentRef.current;
        if (!content) { throw new Error('dropdown input field content div is missing'); }
        const element: any = (key === 'ArrowUp') ? content.lastChild : content.firstChild;
        if (element && element.focus) { element.focus(); }
      }
      // Relay event
      if (this.props.onKeyDown) { this.props.onKeyDown(event); }
    }
  }

  /**
   * Call the "ref" property functions.
   * Do this whenever there's a possibility that the referenced elements has been replaced.
   */
  updatePropRefs(): void {
    if (this.props.inputRef) {
      this.props.inputRef(this.inputRef.current || null);
    }
  }

  static contextType = LangContext;
}

/** Get the index of an item element (or -1 if index was not found). */
function getListItemIndex(target: any): number {
  if (target instanceof Element || target instanceof HTMLElement) {
    return parseInt(target.getAttribute('data-dropdown-index') || '-1', 10);
  }
  return -1;
}

/** Check if two arrays are of equal length and contains the exact same items in the same order. */
function checkIfArraysAreEqual(a: Array<any>, b: Array<any>): boolean {
  if (a.length !== b.length) { return false; }
  for (let i = a.length; i >= 0; i--) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}
