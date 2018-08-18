import * as React from 'react';
import { Link } from 'react-router-dom';
import { Search, ISearchOnSearchEvent } from './generic/search/Search';
import { IDefaultProps } from '../interfaces';

export interface IHeaderProps extends IDefaultProps {
  onSearch?: (event: ISearchOnSearchEvent) => void;
}
export interface IHeaderState {

}

export class Header extends React.Component<IHeaderProps, IHeaderState> {
  constructor(props: IHeaderProps) {
    super(props);
    this.state = {
    };
    this.onSearch = this.onSearch.bind(this);
  }
  render() {
    const searchClassNames = {
      search:         'header__search',
      input:          'header__search__input',
      tag:            'header__search__tag',
      tagText:        'header__search__tag__text',
      tagRemove:      'header__search__tag__remove',
      tagRemoveInner: 'header__search__tag__remove__inner',
    };
    return (
      <div className="header">
        <ul className="header__menu">
          <li className="header__menu__item">
            <Link to="/" className="header__menu__item__link">Home</Link>
          </li>
          <li className="header__menu__item">
            <Link to="/browse" className="header__menu__item__link">Browse</Link>
          </li>
          <li className="header__menu__item">
            <Link to="/about" className="header__menu__item__link">About</Link>
          </li>
        </ul>
        <Search onSearch={this.onSearch} classNames={searchClassNames} />
      </div>
    );
  }
  onSearch(event: ISearchOnSearchEvent): void {
    if (this.props.onSearch) {
      this.props.onSearch(event);
    }
  }
}
