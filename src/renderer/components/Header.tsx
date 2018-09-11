import * as React from 'react';
import { Link } from 'react-router-dom';
import { Search, ISearchOnSearchEvent } from './Search';
import { IDefaultProps } from '../interfaces';
import { GameOrder, IGameOrderChangeEvent } from './GameOrder';
import { Paths } from '../Paths';

export interface IHeaderProps extends IDefaultProps {
  onSearch?: (event: ISearchOnSearchEvent) => void;
  onOrderChange?: (event: IGameOrderChangeEvent) => void;
}

export class Header extends React.Component<IHeaderProps, {}> {
  constructor(props: IHeaderProps) {
    super(props);
    this.onSearch = this.onSearch.bind(this);
    this.onOrderChange = this.onOrderChange.bind(this);
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
        {/* Header Menu */}
        <ul className="header__menu">
          <li className="header__menu__item">
            <Link to={Paths.browse} className="header__menu__item__link">Browse</Link>
          </li>
          <li className="header__menu__item">
            <Link to={Paths.logs} className="header__menu__item__link">Logs</Link>
          </li>
          <li className="header__menu__item">
            <Link to={Paths.config} className="header__menu__item__link">Config</Link>
          </li>
          <li className="header__menu__item">
            <Link to={Paths.about} className="header__menu__item__link">About</Link>
          </li>
        </ul>
        {/* Header Search */}
        <Search onSearch={this.onSearch} classNames={searchClassNames} />
        {/* Header Drop-downs */}
        <GameOrder onChange={this.onOrderChange} />
      </div>
    );
  }

  private onSearch(event: ISearchOnSearchEvent): void {
    if (this.props.onSearch) {
      this.props.onSearch(event);
    }
  }

  private onOrderChange(event: IGameOrderChangeEvent): void {
    if (this.props.onOrderChange) {
      this.props.onOrderChange(event);
    }
  }
}
