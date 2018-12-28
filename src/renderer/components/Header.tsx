import * as React from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import { GameOrder, IGameOrderChangeEvent } from './GameOrder';
import { Paths } from '../Paths';
import * as Util from '../Util';
import { OpenIcon } from './OpenIcon';
import { SearchQuery } from '../store/search';
import { WithPreferencesProps } from '../containers/withPreferences';

interface OwnProps {
  searchQuery: SearchQuery;
  onSearch: (text: string, redirect: boolean) => void;
  onOrderChange?: (event: IGameOrderChangeEvent) => void;
  onToggleLeftSidebarClick?: () => void;
  onToggleRightSidebarClick?: () => void;
}

export type IHeaderProps = OwnProps & RouteComponentProps & WithPreferencesProps;

export interface IHeaderState {
  searchText: string;
}

export class Header extends React.Component<IHeaderProps, IHeaderState> {
  private searchInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IHeaderProps) {
    super(props);
    this.state = {
      searchText: this.props.searchQuery.text,
    };
  }

  componentDidMount() {
    window.addEventListener('keypress', this.onKeypress);
  }

  componentWillUnmount() {
    window.removeEventListener('keypress', this.onKeypress);
  }

  render() {
    const showLeftSidebar = this.props.preferencesData.browsePageShowLeftSidebar;
    const showRightSidebar = this.props.preferencesData.browsePageShowRightSidebar;
    const { searchText } = this.state;
    return (
      <div className='header'>
        {/* Header Menu */}
        <div className='header__wrap'>
          <ul className='header__menu'>
            <li className='header__menu__item'>
              <Link to={Paths.HOME} className='header__menu__item__link'>Home</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.BROWSE} className='header__menu__item__link'>Browse</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.LOGS} className='header__menu__item__link'>Logs</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.CONFIG} className='header__menu__item__link'>Config</Link>
            </li>
            <li className='header__menu__item'>
              <Link to={Paths.ABOUT} className='header__menu__item__link'>About</Link>
            </li>
            { this.props.preferencesData.showDeveloperTab ? (
              <li className='header__menu__item'>
                <Link to={Paths.DEVELOPER} className='header__menu__item__link'>Developer</Link>
              </li>
            ) : undefined }
          </ul>
        </div>
        {/* Header Search */}
        <div className='header__wrap header__wrap--width-restricted header__search__wrap'>
          <div>
            <div className='header__search'>
              <div className='header__search__left'>
                <input className='header__search__input' ref={this.searchInputRef}
                       value={searchText} placeholder='Search...'
                       onChange={this.onSearchChange} onKeyDown={this.onSearchKeyDown} />                
              </div>
              <div className='header__search__right'
                   onClick={ searchText ? this.onClearClick : undefined }>
                <div className='header__search__right__inner'>
                  <OpenIcon className='header__search__icon' icon={ searchText ? 'circle-x' : 'magnifying-glass' } />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Header Drop-downs */}
        <div className='header__wrap'>
          <div>
            <GameOrder onChange={this.props.onOrderChange}/>
          </div>
        </div>
        {/* Right-most portion */}
        <div className='header__wrap header__right'>
          <div>
            {/* Toggle Right Sidebar */}
            <div className='header__toggle-sidebar'
                 title={showRightSidebar ? 'Hide right sidebar' : 'Show right sidebar'}
                 onClick={this.props.onToggleRightSidebarClick}>
              <OpenIcon icon={showRightSidebar ? 'collapse-right' : 'expand-right'} />
            </div>
            {/* Toggle Left Sidebar */}
            <div className='header__toggle-sidebar'
                 title={showLeftSidebar ? 'Hide left sidebar' : 'Show left sidebar'}
                 onClick={this.props.onToggleLeftSidebarClick}>
              <OpenIcon icon={showLeftSidebar ? 'collapse-left' : 'expand-left'} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  private onSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    this.setState({ searchText: value });
    // "Clear" the search when the search field gets empty
    if (value === '') { this.props.onSearch('', false); }
  }

  private onSearchKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      const value = this.state.searchText;
      this.props.onSearch(value, true);
      Util.easterEgg(value);
    }
  }

  private onKeypress = (event: KeyboardEvent): void => {
    if (event.ctrlKey && event.code === 'KeyF') {
      const element = this.searchInputRef.current;
      if (element) {
        element.select();
        event.preventDefault();
      }
    }
  }

  private onClearClick = (): void => {
    this.setState({ searchText: '' });
    this.props.onSearch('', false);
  }
}
