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
  onToggleLeftSidebarClick?: () => void;
  onToggleRightSidebarClick?: () => void;
}

export class Header extends React.Component<IHeaderProps, {}> {
  constructor(props: IHeaderProps) {
    super(props);
    this.onSearch = this.onSearch.bind(this);
    this.onCleared = this.onCleared.bind(this);
    this.onOrderChange = this.onOrderChange.bind(this);
    this.onToggleLeftSidebarClick = this.onToggleLeftSidebarClick.bind(this);
    this.onToggleRightSidebarClick = this.onToggleRightSidebarClick.bind(this);
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
    const showLeftSidebar = window.External.preferences.data.browsePageShowLeftSidebar;
    const showRightSidebar = window.External.preferences.data.browsePageShowRightSidebar;
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
            {/* Toggle Right Sidebar */}
            <div className='header__toggle-sidebar'
                 title={showRightSidebar ? 'Hide right sidebar' : 'Show right sidebar'}
                 onClick={this.onToggleRightSidebarClick}>
              <OpenIcon icon={showRightSidebar ? 'collapse-right' : 'expand-right'} />
            </div>
            {/* Toggle Left Sidebar */}
            <div className='header__toggle-sidebar'
                 title={showLeftSidebar ? 'Hide left sidebar' : 'Show left sidebar'}
                 onClick={this.onToggleLeftSidebarClick}>
              <OpenIcon icon={showLeftSidebar ? 'collapse-left' : 'expand-left'} />
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

  private onToggleLeftSidebarClick(event: React.MouseEvent): void {
    if (this.props.onToggleLeftSidebarClick) {
      this.props.onToggleLeftSidebarClick();
    }
  }

  private onToggleRightSidebarClick(event: React.MouseEvent): void {
    if (this.props.onToggleRightSidebarClick) {
      this.props.onToggleRightSidebarClick();
    }
  }
}
