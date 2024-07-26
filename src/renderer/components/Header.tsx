import * as remote from '@electron/remote';
import { openContextMenu } from '@renderer/components/app';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { FpfssUser } from '@shared/back/types';
import { getLibraryItemTitle } from '@shared/library/util';
import { MenuItemConstructorOptions } from 'electron';
import * as React from 'react';
import { Link, RouteComponentProps, useLocation } from 'react-router-dom';
import { WithPreferencesProps } from '../containers/withPreferences';
import { Paths } from '../Paths';
import { joinLibraryRoute } from '../Util';
import { LangContext } from '../util/lang';
import { OpenIcon } from './OpenIcon';

type OwnProps = {
  /** Array of library routes */
  libraries: string[];
  /** Called when the left sidebar toggle button is clicked. */
  onToggleLeftSidebarClick?: () => void;
  /** Called when the right sidebar toggle button is clicked. */
  onToggleRightSidebarClick?: () => void;
  user: FpfssUser | null;
  logoutUser: () => void;
};

export type HeaderProps = OwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps;

type HeaderState = {};

/** The header that is always visible at the top of the main window (just below the title bar). */
export class Header extends React.Component<HeaderProps, HeaderState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  constructor(props: HeaderProps) {
    super(props);
  }

  render() {
    const strings = this.context.app;
    const {
      preferencesData: { browsePageShowLeftSidebar, browsePageShowRightSidebar, enableEditing, showDeveloperTab, onlineManual, offlineManual },
      onToggleLeftSidebarClick, onToggleRightSidebarClick, libraries
    } = this.props;

    // FPFSS user context menu
    const contextButtons: MenuItemConstructorOptions[] = [
      {
        label: strings.fpfssProfile,
        enabled: true,
        click: () => {
          remote.shell.openExternal(`${this.props.preferencesData.fpfssBaseUrl}/web/profile`);
        }
      },
      {
        label: strings.fpfssLogout,
        enabled: true,
        click: () => {
          this.props.logoutUser();
        }
      }
    ];
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
        {/* Right-most portion */}
        <div className='header__wrap header__right'>
          {this.props.user && (
            <div className='header-user-box' onClick={() => openContextMenu(contextButtons)}>
              {/* FPFSS user status */}
              <div className='header-user-icon' style={{ backgroundImage: `url(${this.props.user.avatarUrl})` }}></div>
              <div className='header-user-name'>{this.props.user.username}</div>
            </div>
          )}
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
