import * as React from 'react';
import { Link } from 'react-router-dom';
import { Search } from './generic/search/Search';

export const Header: React.StatelessComponent<{}> = (props) => {
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
      <h2 className="header__title">Library Thingie</h2>
      <div>
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
        <Search onSearch={(a)=>{console.log(a)}} classNames={searchClassNames} />
      </div>
    </div>
  );
};