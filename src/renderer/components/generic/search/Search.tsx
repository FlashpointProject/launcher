import * as React from 'react';
import { IDefaultProps } from '../../../interfaces';
import { SearchTag, ISearchTagClickRemoveEvent } from './SearchTag';
import { StaticRouter } from 'react-router';
import { CANCELLED } from 'dns';

export interface ISearchProps extends IDefaultProps {
  /** Called when enter is pressed in the input field */
  onSearch?: (event: ISearchOnSearchEvent) => void;
  /** Additional class names (the original class names are still applied) */
  classNames?: ISearchClassNames;
}
export interface ISearchState {
  /** Search text currently in the search bar */
  input: string;
  /** Array of text of all tags currently in the search bar */
  tags: string[];
}

export interface ISearchOnSearchEvent {
  input: string;
  tags: string[];
}

export interface ISearchClassNames {
  search?: string;
  input?: string;
  tag?: string;
  tagText?: string;
  tagRemove?: string;
  tagRemoveInner?: string;
}

export class Search extends React.Component<ISearchProps, ISearchState> {
  private _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: ISearchProps) {
    super(props);
    this.state = {
      input: '',
      tags: [],
    };
    this.onChange = this.onChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onClickRemoveTag = this.onClickRemoveTag.bind(this);
  }

  render() {
    const tags = this.state.tags || [];
    const search = this.getClassName('search', 'search');
    const searchInput = this.getClassName('search__input', 'input');
    return (
      <div className={search}>
        {tags.map((tag, i) => {
          return (
            <SearchTag key={i} id={i} text={tag} 
                       onClickRemove={this.onClickRemoveTag}
                       classNames={this.props.classNames} />
          );
        })}
        <input className={searchInput} value={this.state.input} onChange={this.onChange} onKeyDown={this.onKeyDown}  ref={this._inputRef}/>
      </div>
    );
  }

  onChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Get the new input string and check it for any new input tags
    const match = matchAllTags(e.target.value);
    const state: any = {
      input: match.input
    };
    // Add any new input tags to the state
    if (match.tags.length > 0) {
      state.tags = this.state.tags.slice();
      Array.prototype.push.apply(state.tags, match.tags);
    }
    // Update the state
    this.setState(state);
  }

  onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Backspace (was pressed)
    if (e.keyCode === 8) {
      // The caret (text cursor) is at the left-most position
      const current = this._inputRef.current;
      if (current && current.selectionStart === 0 && current.selectionEnd === 0) {
        // There are any tags
        const tags = this.state.tags;
        if (tags.length > 0) {
          // Remove the right-most tag
          this.setState({
            tags: tags.slice(0, tags.length-1)
          });
        }
      }
    }
    // Enter (was pressed)
    if (e.keyCode === 13) {
      const onSearch = this.props.onSearch;
      if (onSearch) {
        onSearch({
          input: this.state.input,
          tags: this.state.tags.slice(),
        });
      }
    }
  }

  onClickRemoveTag(tag: ISearchTagClickRemoveEvent) {
    if (!this.state.tags) { throw new Error('A <SearchTag> of a <Search> had it\'s "Remove Button" clicked, but there are no tags present in the <Search>.'); }
    if (tag.id === undefined) { throw new Error('A <SearchTag> of a <Search> had it\'s "Remove Button" clicked, but the <SearchTag>\'s property "id" is not set.'); }
    // Remove tag with the same index as the tags id (they should be the same)
    const tags = this.state.tags.slice();
    tags.splice(tag.id, 1);
    this.setState({
      tags: tags
    });
  }

  getClassName(className: string, propName: string): string {
    if (this.props.classNames) {
      const cn: string = (this.props.classNames as any)[propName] || '';
      if (cn) {
        return className+' '+cn;
      }
    }
    return className;
  }
}

/** Get all tags (and the input string without the tags) from an input string */
function matchAllTags(input: string) {
  const reg: RegExp = /#.*?(\ )/g;
  const tags: string[] = [];
  let cleanInput: string = input;
  //
  let m;
  while (m = reg.exec(input)) {
    const match: string = m[0];
    tags.push(match.substr(1, match.length - 2));
    cleanInput = cleanInput.replace(match, '');
  }
  //
  return {
    tags: tags,
    input: cleanInput,
  };
}

