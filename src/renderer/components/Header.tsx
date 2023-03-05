import { Tag } from '@database/entity/Tag';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { BackIn, TagSuggestion } from '@shared/back/types';
import { getLibraryItemTitle } from '@shared/library/util';
import { GameOrderBy, GameOrderReverse, Platform } from 'flashpoint-launcher';
import * as React from 'react';
import { Link, RouteComponentProps, useLocation } from 'react-router-dom';
import { WithPreferencesProps } from '../containers/withPreferences';
import { Paths } from '../Paths';
import { SearchQuery } from '../store/search';
import { easterEgg, getPlatformIconURL, joinLibraryRoute } from '../Util';
import { LangContext } from '../util/lang';
import { GameOrder, GameOrderChangeEvent } from './GameOrder';
import { InputElement } from './InputField';
import { OpenIcon } from './OpenIcon';
import { TagInputField } from './TagInputField';

type OwnProps = {
  /** The most recent search query. */
  searchQuery: SearchQuery;
  /** Current value of the "order by" drop down. */
  orderBy: GameOrderBy;
  /** Current value of the "order reverse" drop down. */
  orderReverse: GameOrderReverse;
  /** Array of library routes */
  libraries: string[];
  /** Called when a search is made. */
  onSearch: (text: string, redirect: boolean) => void;
  /** Called when any of the ordering parameters are changed (by the header or a sub-component). */
  onOrderChange?: (event: GameOrderChangeEvent) => void;
  /** Called when the left sidebar toggle button is clicked. */
  onToggleLeftSidebarClick?: () => void;
  /** Called when the right sidebar toggle button is clicked. */
  onToggleRightSidebarClick?: () => void;
  logoVersion: number;
};

export type HeaderProps = OwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps;

type HeaderState = {
  /** Current text in the search field. */
  searchText: string;
  /** Current tag suggestions under the search field */
  tagSuggestions: TagSuggestion<Tag>[];
  /** Current platform suggestions under the search field */
  platformSuggestions: TagSuggestion<Platform>[];
};

/** The header that is always visible at the top of the main window (just below the title bar). */
export class Header extends React.Component<HeaderProps, HeaderState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  searchInputRef: React.RefObject<InputElement> = React.createRef();

  constructor(props: HeaderProps) {
    super(props);
    this.state = {
      searchText: this.props.searchQuery.text,
      tagSuggestions: [],
      platformSuggestions: [],
    };
  }

  componentDidMount() {
    window.addEventListener('keypress', this.onKeypress);
  }

  componentWillUnmount() {
    window.removeEventListener('keypress', this.onKeypress);
  }

  componentDidUpdate(prevProps: HeaderProps, prevState: HeaderState) {
    // Update the text in the text-box if the search text has changed
    const text = this.props.searchQuery.text;
    if (text !== prevProps.searchQuery.text &&
        text !== prevState.searchText) {
      this.setState({ searchText: text });
    }
  }

  render() {
    const strings = this.context.app;
    const {
      preferencesData: { browsePageShowLeftSidebar, browsePageShowRightSidebar, enableEditing, showDeveloperTab, onlineManual, offlineManual },
      onOrderChange, onToggleLeftSidebarClick, onToggleRightSidebarClick, libraries
    } = this.props;
    const { searchText } = this.state;
    return (
      <div className='header'>
        {/* Header Menu */}
        <div className='header__wrap'>
          <ul className='header__menu'>
            <MenuItem title={strings.home} link={Paths.HOME} />
            { libraries.length > 0 ? (
              libraries.map(library => (
                <MenuItem
                  key={library}
                  title={getLibraryItemTitle(library, this.context.libraries)}
                  link={joinLibraryRoute(library)} />
              ))
            ) : (
              <MenuItem
                title={strings.browse}
                link={Paths.BROWSE} />
            ) }
            { enableEditing ? (
              <>
                <MenuItem
                  title={strings.tags}
                  link={Paths.TAGS} />
                <MenuItem
                  title={strings.categories}
                  link={Paths.CATEGORIES} />
              </>
            ) : undefined }
            <MenuItem
              title={strings.logs}
              link={Paths.LOGS} />
            <MenuItem
              title={strings.config}
              link={Paths.CONFIG} />
            { (onlineManual || offlineManual) && (
              <MenuItem
                title={strings.manual}
                link={Paths.MANUAL} />
            )}
            <MenuItem
              title={strings.about}
              link={Paths.ABOUT} />
            { enableEditing ? (
              <MenuItem
                title={strings.curate}
                link={Paths.CURATE} />
            ) : undefined }
            { showDeveloperTab ? (
              <MenuItem
                title={strings.developer}
                link={Paths.DEVELOPER} />
            ) : undefined }
          </ul>
        </div>
        {/* Header Search */}
        <div className='header__wrap header__wrap--width-restricted header__search__wrap'>
          <div>
            <div className='header__search'>
              <div className='header__search__left'>
                {this.renderTagInput()}
              </div>
              <div
                className='header__search__right'
                onClick={ searchText ? this.onClearClick : undefined }>
                <div className='header__search__right__inner'>
                  <OpenIcon
                    className='header__search__icon'
                    icon={ searchText ? 'circle-x' : 'magnifying-glass' } />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Header Drop-downs */}
        <div className='header__wrap'>
          <div>
            <GameOrder
              onChange={onOrderChange}
              orderBy={this.props.orderBy}
              orderReverse={this.props.orderReverse} />
          </div>
        </div>
        {/* Right-most portion */}
        <div className='header__wrap header__right'>
          <div>
            {/* Toggle Right Sidebar */}
            <div
              className='header__toggle-sidebar'
              title={browsePageShowRightSidebar ? strings.hideRightSidebar : strings.showRightSidebar}
              onClick={onToggleRightSidebarClick}>
              <OpenIcon icon={browsePageShowRightSidebar ? 'collapse-right' : 'expand-right'} />
            </div>
            {/* Toggle Left Sidebar */}
            <div
              className='header__toggle-sidebar'
              title={browsePageShowLeftSidebar ? strings.hideLeftSidebar : strings.showLeftSidebar}
              onClick={onToggleLeftSidebarClick}>
              <OpenIcon icon={browsePageShowLeftSidebar ? 'collapse-left' : 'expand-left'} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderTagInput = () => {
    const strings = this.context.app;

    // Set the suggestions to the appropriate field being searched for currently
    let suggestions: TagSuggestion<any>[] = [];
    let onSuggSubmit: ((tag: TagSuggestion<any>) => void) = (t) => {};
    let renderIconSugg: ((sugg: TagSuggestion<any>) => JSX.Element) | undefined = undefined;
    if (this.state.tagSuggestions.length > 0) {
      suggestions = this.state.tagSuggestions;
      onSuggSubmit = this.onTagSuggestionSelect;
    } else if (this.state.platformSuggestions.length > 0) {
      suggestions = this.state.platformSuggestions;
      onSuggSubmit = this.onPlatformSuggestionSelect;
      renderIconSugg = this.renderPlatformIconSugg;
    }

    return (
      <TagInputField
        className='header__search__input'
        editable={true}
        text={this.state.searchText}
        tags={[]} /** We're not using the tag list */
        suggestions={suggestions}
        categories={this.props.tagCategories}
        placeholder={strings.searchPlaceholder}
        onTagSubmit={this.onSearchSubmit}
        onTagSuggestionSelect={onSuggSubmit}
        renderIconSugg={renderIconSugg}
        onChange={this.onSearchChange} />
    );
  };

  onSearchChange = (event: React.ChangeEvent<InputElement>): void => {
    const value = event.target.value;
    this.setState({ searchText: value }, () => {
      // Update tag suggestions if currently in `tag:` search
      const tagRegex = /(#([^\s]+)|tag:([^\s]+))$/;
      const tagMatch = tagRegex.exec(this.state.searchText);
      if (tagMatch) {
        const tagName = tagMatch[2] || tagMatch[3];
        window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, tagName, this.props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !this.props.preferencesData.browsePageShowExtreme)))
        .then(data => {
          if (data) { this.setState({ tagSuggestions: data }); }
        });
      } else {
        // Not searching by tag
        this.setState({ tagSuggestions: [] });
      }
      // Update platform suggestions if currently in `platform:` search
      const platformRegex = /(#([^\s]+)|platform:([^\s]+))$/;
      const platformMatch = platformRegex.exec(this.state.searchText);
      if (platformMatch) {
        const platformName = platformMatch[2] || platformMatch[3];
        window.Shared.back.request(BackIn.GET_PLATFORM_SUGGESTIONS, platformName)
        .then(data => {
          if (data) { this.setState({ platformSuggestions: data }); }
        });
      } else {
        // Not searching by platform
        this.setState({ platformSuggestions: [] });
      }
    });
    // "Clear" the search when the search field gets empty
    if (value === '') { this.props.onSearch('', false); }
  };

  onSearchSubmit = (value: string): void => {
    this.props.onSearch(value, true);
    easterEgg(value);
  };

  onTagSuggestionSelect = (suggestion: TagSuggestion<Tag>): void => {
    const tagRegex = /((#)([^\s]+)|(tag:)([^\s]+))$/;
    const match = tagRegex.exec(this.state.searchText);
    if (match) {
      console.log(match);
      const quickSearch = match[4] ? false : true;
      console.log(quickSearch);
      const index = match.index + (quickSearch ? 1 : 4);
      this.setState({
        searchText: this.state.searchText.slice(0, index) + `"${suggestion.primaryAlias}"`,
        tagSuggestions: []
      });
    }
  };


  onPlatformSuggestionSelect = (suggestion: TagSuggestion<Platform>): void => {
    const platformRegex = /((#)([^\s]+)|(platform:)([^\s]+))$/;
    const match = platformRegex.exec(this.state.searchText);
    if (match) {
      console.log(match);
      const quickSearch = match[4] ? false : true;
      console.log(quickSearch);
      const index = match.index + (quickSearch ? 1 : 9);
      this.setState({
        searchText: this.state.searchText.slice(0, index) + `"${suggestion.primaryAlias}"`,
        platformSuggestions: []
      });
    }
  };

  onKeypress = (event: KeyboardEvent): void => {
    if (event.ctrlKey && event.code === 'KeyF') {
      const element = this.searchInputRef.current;
      if (element) {
        element.select();
        event.preventDefault();
      }
    }
  };

  onClearClick = (): void => {
    this.setState({ searchText: '' });
    this.props.onSearch('', false);
  };

  renderPlatformIconSugg = (platformSugg: TagSuggestion<Platform>) => {
    const iconUrl = getPlatformIconURL(platformSugg.primaryAlias, this.props.logoVersion);
    return (
      <div
        className='platform-tag__icon'
        style={{ backgroundImage: `url(${iconUrl})` }} />
    );
  };
}

type MenuItemProps = {
  title: string;
  link: string;
};

// An item in the header menu. Used as buttons to switch between tabs/pages.
function MenuItem({ title, link }: MenuItemProps) {
  const location = useLocation();
  const selected = link === '/' ? location.pathname === link : location.pathname.startsWith(link);
  return (
    <li className='header__menu__item'>
      <Link to={link} className={`header__menu__item__link ${selected ? 'header__menu__item__link-selected' : ''}`}>{title}</Link>
    </li>
  );
}
