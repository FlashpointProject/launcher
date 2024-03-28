import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { checkIfAncestor } from '../Util';
import { InputField, InputFieldProps } from './InputField';
import { OpenIcon } from './OpenIcon';
import { Tag, TagCategory, TagSuggestion } from 'flashpoint-launcher';

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
  /** Custom icon render func */
  renderIcon?: (tag: Tag) => JSX.Element;
  /** Custom icon render func (suggestion) */
  renderIconSugg?: (suggestion: TagSuggestion) => JSX.Element;
  /** Tag suggestions based on currently entered tag */
  suggestions: TagSuggestion[];
  /** Tag Category info */
  categories: TagCategory[];
  /** Primary value */
  primaryValue?: string;
  /** Promote value to primary */
  selectPrimaryValue?: (value: string) => void;
};

type TagInputFieldState = {
  expanded: boolean;
};

/** An input element with a drop-down menu that can list any number of selectable and clickable text elements. */
export class TagInputField extends React.Component<TagInputFieldProps, TagInputFieldState> {
  rootRef: React.RefObject<HTMLDivElement> = React.createRef();
  contentRef: React.RefObject<HTMLDivElement> = React.createRef();
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
            ref={this.contentRef}
            onKeyDown={this.onSuggestionKeyDown}
            className={'input-dropdown__content simple-scroll'} >
            { this.renderSuggestions(suggestions, expanded) }
          </div>
          : undefined }
        <div
          className={'tag-input-dropdown__content'}
          onClick={this.onListItemClick} >
          { this.renderItems(items, this.props.primaryValue) }
        </div>
      </div>
    );
  }

  /** Renders the list of items in the drop-down menu. */
  renderSuggestions = memoizeOne<(items: TagSuggestion[], expanded: boolean) => JSX.Element[]>((items: TagSuggestion[]) => {
    return items.map((suggestion, index) => this.renderSuggestionItem(suggestion, index, this.props.renderIconSugg));
  }, ([ itemsA, expandedA ], [ itemsB, expandedB ]) => {
    return expandedA === expandedB ? checkIfArraysAreEqual(itemsA, itemsB) : false;
  });

  renderSuggestionItem = (suggestion: TagSuggestion, index: number, renderIconSugg?: (suggestion: TagSuggestion) => JSX.Element) => {
    const aliasRender = suggestion.matchedFrom !== suggestion.name ? (
      <div className='tag-inner'>
        <p>{suggestion.matchedFrom} <b className='tag_alias-joiner'>{'->'}</b> {suggestion.name}</p>
        {suggestion.gamesCount ? (<p className='tag-count'>{suggestion.gamesCount}</p>) : undefined}
      </div>
    ) : (
      <div className='tag-inner'>
        <p>{suggestion.name}</p>
        {suggestion.gamesCount ? (<p className='tag-count'>{suggestion.gamesCount}</p>) : undefined}
      </div>
    );

    const icon = renderIconSugg ? renderIconSugg(suggestion) : (
      <OpenIcon
        className='tag-icon'
        color={this.props.categories.find(c => c.name === suggestion.category)?.color || '#FFFFFF'}
        key={index * 2}
        icon='tag'/>
    );

    return (
      <div
        onClick={() => this.onSuggestionItemClick(suggestion)}
        data-dropdown-index={index}
        className='tag-input-dropdown__suggestion' key={index} >
        {icon}
        <label
          className='tag-suggestion-label'
          key={index * 2 + 1}
          tabIndex={0}>
          {aliasRender}
        </label>
      </div>
    );
  };

  /** Renders the list of items in the drop-down menu. */
  renderItems = memoizeOne<(items: Tag[], primaryPlatform?: string) => JSX.Element[]>((items: Tag[], primaryPlatform?: string) => {
    const className = this.props.editable ? 'tag-editable' : 'tag-static';
    return items.map((tag, index) => {
      const category = this.props.categories.find(c => c.name == tag.category);
      const shownAlias = tag.name || 'No Primary Alias Set';
      const icon = this.props.renderIcon ? this.props.renderIcon(tag) : (
        <OpenIcon
          className='tag-icon'
          color={category ? category.color : '#FFFFFF'}
          key={index * 2}
          icon={category ? 'tag' : 'question-mark'}/>
      );

      let primaryElement = <></>;
      if (primaryPlatform && this.props.selectPrimaryValue && this.props.editable) {
        const isPrimary = tag.name === primaryPlatform;
        if (!isPrimary) {
          primaryElement = (
            <div
              className='browse-right-sidebar__title-row__buttons__promote-button'
              onClick={() => this.props.selectPrimaryValue && this.props.selectPrimaryValue(tag.name)}>
              <OpenIcon
                icon='chevron-top' />
            </div>
          );
        } else {
          primaryElement = (
            <div
              className='browse-right-sidebar__title-row__buttons__promote-button'>
              {'(Primary)'}
            </div>
          );
        }

      }

      return (
        <div
          className={'tag ' + className}
          key={index}>
          {icon}
          <label
            className='tag-label'
            title={tag.description}
            data-dropdown-index={index}
            key={index * 2 + 1}
            tabIndex={0}>
            { shownAlias }
          </label>
          {primaryElement}
          { this.props.editable && (
            <div
              className='browse-right-sidebar__title-row__buttons__discard-button'
              onClick={() => this.props.onTagEditableSelect && this.props.onTagEditableSelect(this.props.tags[index], index)}>
              <OpenIcon
                icon='delete' />
            </div>
          )}
        </div>
      );
    });
  }, ([ itemsA, valueA ], [ itemsB, valueB]) => {
    return checkIfArraysAreEqual(itemsA, itemsB) && valueA === valueB;
  });

  onListItemClick = (event: React.MouseEvent): void => {
    if (!this.props.disabled) {
      if (!this.props.editable) {
        if (this.props.onTagSelect) {
          const index = getListItemIndex(event.target);
          if (index >= 0) {
            this.props.onTagSelect(this.props.tags[index], index);
          }
        }
      }
    }
  };

  onSuggestionItemClick = (suggestion: TagSuggestion): void => {
    if (!this.props.disabled) {
      if (this.props.onTagSuggestionSelect) {
        this.props.onTagSuggestionSelect(suggestion);
      }
    }
  };

  onInputChange = (event: React.ChangeEvent<InputElement>): void => {
    if (!this.props.disabled) {
      if (this.props.onChange) { this.props.onChange(event); }
    }
  };

  onInputFieldClick = (): void => {
    this.setState({ expanded: true });
  };

  onSuggestionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const { key } = event;
    const element = document.activeElement ? document.activeElement.parentElement : document.activeElement;
    if (key === 'Enter' && this.props.onTagSuggestionSelect) {
      const idx = getListItemIndex(element);
      if (idx > -1) {
        const tagSuggestion = this.props.suggestions[idx];
        this.props.onTagSuggestionSelect(tagSuggestion);
        const inputElement = this.inputRef.current;
        if (inputElement) { inputElement.focus(); }
      }
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      // Focus the first or last item
      if (element && checkIfAncestor(element, this.contentRef.current)) {
        const nextParent = (key === 'ArrowUp')
          ? element.previousSibling
          : element.nextElementSibling;
        if (nextParent) {
          const nextChild: any = nextParent.lastChild;
          if (nextChild && nextChild.focus) {
            nextChild.focus();
          }
        }
      }
      event.preventDefault();
    }
  };

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
        if (content) {
          const parentElement = (key === 'ArrowUp') ? content.lastChild : content.firstChild;
          if (parentElement) {
            const childElement: any = parentElement.lastChild;
            if (childElement && childElement.focus) { childElement.focus(); }
          }
        }
      }
      // Relay event
      if (this.props.onKeyDown) { this.props.onKeyDown(event); }
    }
  };

  onGlobalMouseDown = (event: MouseEvent) => {
    if (this.state.expanded && !event.defaultPrevented) {
      if (!checkIfAncestor(event.target as Element | null, this.rootRef.current)) {
        this.setState({ expanded: false });
      }
    }
  };

  onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (this.state.expanded && event.key === 'Escape') {
      this.setState({ expanded: false });
      if (!this.inputRef.current) { throw new Error('input field is missing'); }
      this.inputRef.current.focus();
    }
  };

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

/**
 * Get the index of an item element (or -1 if index was not found).
 *
 * @param target Element / HTMLElement to search find list index attribute on
 */
function getListItemIndex(target: any): number {
  if (target instanceof Element || target instanceof HTMLElement) {
    return parseInt(target.getAttribute('data-dropdown-index') || '-1', 10);
  }
  return -1;
}

/**
 * Check if two arrays are of equal length and contains the exact same items in the same order.
 *
 * @param a First to compare
 * @param b Second to compare
 */
function checkIfArraysAreEqual(a: Array<any>, b: Array<any>): boolean {
  if (a.length !== b.length) { return false; }
  for (let i = a.length; i >= 0; i--) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}
