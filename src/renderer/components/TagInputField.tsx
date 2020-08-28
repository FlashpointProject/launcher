import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { TagSuggestion } from '@shared/back/types';
import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { checkIfAncestor } from '../Util';
import { InputField, InputFieldProps } from './InputField';
import { OpenIcon } from './OpenIcon';

/** A function that receives a HTML element (or null). */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

/** Input element types used by this component. */
type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type TagInputFieldProps = InputFieldProps & {
  /** Items to display in the drop-down list. */
  tags: Tag[];
  /** Called when a tag is selected */
  onTagSelect?: (tag: Tag, index: number) => void;
  /** Called when a tag is selected when editable */
  onTagEditableSelect?: (tag: Tag, index: number) => void;
  /** Called when a tag suggestion is selected */
  onTagSuggestionSelect?: (suggestion: TagSuggestion) => void;
  /** Called when the tag input box is submitted */
  onTagSubmit?: (text: string) => void;
  /** Function for getting a reference to the input element. Called whenever the reference could change. */
  inputRef?: RefFunc<InputElement>;
  /** Tag suggestions based on currently entered tag */
  suggestions: TagSuggestion[];
  /** Tag Category info */
  categories: TagCategory[];
};

type TagInputFieldState = {
  expanded: boolean;
};

/** An input element with a drop-down menu that can list any number of selectable and clickable text elements. */
export class TagInputField extends React.Component<TagInputFieldProps, TagInputFieldState> {
  rootRef: React.RefObject<HTMLDivElement> = React.createRef();
  contentRef: React.RefObject<HTMLUListElement> = React.createRef();
  inputRef: React.RefObject<InputElement> = React.createRef();

  constructor(props: TagInputFieldProps) {
    super(props);
    this.state = {
      expanded: false
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.onGlobalMouseDown);
    document.addEventListener('keydown', this.onGlobalKeyDown);
    this.updatePropRefs();
  }

  componentDidUpdate() {
    this.updatePropRefs();
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onGlobalMouseDown);
    document.removeEventListener('keydown', this.onGlobalKeyDown);
    this.updatePropRefs();
  }

  render() {
    const { suggestions, tags: items, className, editable, text } = this.props;
    const { expanded } = this.state;
    // Render input field
    const inputField = (
      <InputField
        { ...this.props }
        text={text}
        className={(className || '') + ' input-dropdown__input-field__input__inner'}
        onChange={this.onInputChange}
        onClick={this.onInputFieldClick}
        onKeyDown={this.onInputKeyDown}
        reference={this.inputRef} />
    );
    // Render
    return (
      <div
        className={'input-dropdown' + (this.props.disabled ? ' input-dropdown--disabled' : '')}
        ref={this.rootRef}>
        { editable ? inputField : undefined }
        { expanded && suggestions.length > 0 ?
          <div
            className={'input-dropdown__content simple-scroll'} >
            { this.renderSuggestions(suggestions, expanded, this.contentRef) }
          </div>
          : undefined }
        <div
          className={'tag-input-dropdown__content'}
          onClick={this.onListItemClick} >
          { this.renderItems(items) }
        </div>
      </div>
    );
  }

  /** Renders the list of items in the drop-down menu. */
  renderSuggestions = memoizeOne<(items: TagSuggestion[], expanded: boolean, ref: React.RefObject<HTMLUListElement>) => JSX.Element>((items: TagSuggestion[], expanded: boolean,  ref: React.RefObject<HTMLUListElement>) => {
    const itemsRendered = items.map((suggestion, index) => this.renderSuggestionItem(suggestion, index));
    return (
      <ul
        ref={ref}>
        {itemsRendered}
      </ul>
    );
  }, ([ itemsA, expandedA ], [ itemsB, expandedB ]) => {
    return expandedA === expandedB ? checkIfArraysAreEqual(itemsA, itemsB) : false;
  });

  renderSuggestionItem = (suggestion: TagSuggestion, index: number) => {
    const category = this.props.categories.find(c => c.id == suggestion.tag.categoryId);
    const aliasRender = suggestion.alias ? (
      <div className='tag-inner'>
        <p>{suggestion.alias} <b className='tag_alias-joiner'>{'->'}</b> {suggestion.primaryAlias}</p>
        {suggestion.tag.count ? (<p className='tag-count'>{suggestion.tag.count}</p>) : undefined}
      </div>
    ) : (
      <div className='tag-inner'>
        <p>{suggestion.primaryAlias}</p>
        {suggestion.tag.count ? (<p className='tag-count'>{suggestion.tag.count}</p>) : undefined}
      </div>
    );
    return (
      <li
        onClick={() => this.onSuggestionItemClick(suggestion)}
        onKeyDown={(event) => this.onSuggestionKeyDown(event, suggestion)}
        className='tag-input-dropdown__suggestion' key={index} >
        <OpenIcon
          className='tag-icon'
          color={category ? category.color : '#FFFFFF'}
          key={index * 2}
          icon='tag'/>
        <label
          className='tag-suggestion-label'
          key={index * 2 + 1}
          data-dropdown-index={index}
          tabIndex={0}>
          {aliasRender}
        </label>
      </li>
    );
  };

  /** Renders the list of items in the drop-down menu. */
  renderItems = memoizeOne<(items: Tag[]) => JSX.Element[]>((items: Tag[]) => {
    const className = this.props.editable ? 'tag-editable' : '';
    return items.map((tag, index) => {
      const category = this.props.categories.find(c => c.id == tag.categoryId);
      const shownAlias = tag.primaryAlias ? tag.primaryAlias.name : 'No Primary Alias Set';
      return (
        <div className={'tag ' + className} key={index}>
          <OpenIcon
            className='tag-icon'
            color={category ? category.color : '#FFFFFF'}
            key={index * 2}
            icon='tag'/>
          <label
            className='tag-label'
            title={tag.description}
            key={index * 2 + 1}
            data-dropdown-index={index}
            tabIndex={0}>
            { shownAlias }
          </label>
        </div>
      );
    });
  }, ([ itemsA ], [ itemsB ]) => {
    return checkIfArraysAreEqual(itemsA, itemsB);
  });

  onListItemClick = (event: React.MouseEvent): void => {
    if (!this.props.disabled) {
      if (this.props.editable) {
        if (this.props.onTagEditableSelect) {
          const index = getListItemIndex(event.target);
          if (index >= 0) {
            this.props.onTagEditableSelect(this.props.tags[index], index);
          }
        }
      } else {
        if (this.props.onTagSelect) {
          const index = getListItemIndex(event.target);
          if (index >= 0) {
            this.props.onTagSelect(this.props.tags[index], index);
          }
        }
      }
    }
  }

  onSuggestionItemClick = (suggestion: TagSuggestion): void => {
    if (!this.props.disabled) {
      if (this.props.onTagSuggestionSelect) {
        this.props.onTagSuggestionSelect(suggestion);
      }
    }
  }

  onInputChange = (event: React.ChangeEvent<InputElement>): void => {
    if (!this.props.disabled) {
      if (this.props.onChange) { this.props.onChange(event); }
    }
  }

  onInputFieldClick = (event: React.MouseEvent): void => {
    this.setState({ expanded: true });
  }

  onSuggestionKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, tagSuggestion: TagSuggestion): void => {
    const { key } = event;
    if (key === 'Enter' && this.props.onTagSuggestionSelect) {
      this.props.onTagSuggestionSelect(tagSuggestion);
      const element = this.inputRef.current;
      if (element) { element.focus(); }
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      // Focus the first or last item
      const element = document.activeElement;
      if (element && checkIfAncestor(element, this.contentRef.current)) {
        const next: any = (key === 'ArrowUp')
          ? element.previousSibling
          : element.nextElementSibling;
        if (next && next.focus) {
          next.focus();
          event.preventDefault();
        }
      }
    }
  }

  onInputKeyDown = (event: React.KeyboardEvent<InputElement>): void => {
    this.setState({ expanded: true });
    if (!this.props.disabled) {
      const { key } = event;
      if (key === 'Enter' && this.props.onTagSubmit) {
        this.props.onTagSubmit(this.props.text);
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

  onGlobalMouseDown = (event: MouseEvent) => {
    if (this.state.expanded && !event.defaultPrevented) {
      if (!checkIfAncestor(event.target as Element | null, this.rootRef.current)) {
        this.setState({ expanded: false });
      }
    }
  }

  onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (this.state.expanded && event.key === 'Escape') {
      this.setState({ expanded: false });
      if (!this.inputRef.current) { throw new Error('input field is missing'); }
      this.inputRef.current.focus();
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
