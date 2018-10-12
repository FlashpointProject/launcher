import * as React from 'react';
import { Link } from 'react-router-dom';
import { Search, ISearchOnSearchEvent } from './Search';
import { IDefaultProps } from '../interfaces';
import { GameOrder, IGameOrderChangeEvent } from './GameOrder';
import { Paths } from '../Paths';
import * as Util from '../Util';
import { OpenIcon } from './OpenIcon';

export interface IHeaderProps extends IDefaultProps {
  onSearch?: (event: ISearchOnSearchEvent) => void;
  onOrderChange?: (event: IGameOrderChangeEvent) => void;
  onToggleSidebarClick?: () => void;
}

export class Header extends React.Component<IHeaderProps, {}> {
  constructor(props: IHeaderProps) {
    super(props);
    this.onSearch = this.onSearch.bind(this);
    this.onCleared = this.onCleared.bind(this);
    this.onOrderChange = this.onOrderChange.bind(this);
    this.onToggleSidebarClick = this.onToggleSidebarClick.bind(this);
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
    const showSidebar = window.External.preferences.data.browsePageShowSidebar;
    return (
      <div className='header'>
        {/* Header Menu */}
        <div className='header__wrap'>
          <ul className='header__menu'>
            <li className='header__menu__item'>
              <Link to={Paths.playlists} className='header__menu__item__link'>Playlists</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.browse} className='header__menu__item__link'>Browse</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.logs} className='header__menu__item__link'>Logs</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.config} className='header__menu__item__link'>Config</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.about} className='header__menu__item__link'>About</Link>
            </li>
          </ul>
        </div>
        {/* Header Search */}
        <div className='header__wrap'>
          <div>
            <Search onSearch={this.onSearch} onCleared={this.onCleared} classNames={searchClassNames}
                    disableTags={true}/>
          </div>
        </div>
        {/* Header Drop-downs */}
        <div className='header__wrap'>
          <div>
            <GameOrder onChange={this.onOrderChange}/>
          </div>
        </div>
        {/*  */}
        <div className='header__wrap header__right'>
          <div>
            <div className='header__toggle-sidebar'
                 title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
                 onClick={this.onToggleSidebarClick}>
              <OpenIcon icon={showSidebar ? 'collapse-right' : 'collapse-left'} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  private onSearch(event: ISearchOnSearchEvent): void {
    if (this.props.onSearch) {
      this.props.onSearch(event);
    }
    Util.easterEgg(event.input);
  }

  private onCleared(): void {
    if (this.props.onSearch) {
      this.props.onSearch({ input: '', tags: [] });
    }
  }

  private onOrderChange(event: IGameOrderChangeEvent): void {
    if (this.props.onOrderChange) {
      this.props.onOrderChange(event);
    }
  }

  private onToggleSidebarClick(event: React.MouseEvent): void {
    if (this.props.onToggleSidebarClick) {
      this.props.onToggleSidebarClick();
    }
  }
}
