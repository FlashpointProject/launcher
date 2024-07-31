import * as remote from '@electron/remote';
import { openContextMenu } from '@renderer/components/app';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { FpfssUser } from '@shared/back/types';
import { getLibraryItemTitle } from '@shared/library/util';
import { MenuItemConstructorOptions } from 'electron';
import * as React from 'react';
import { Link, RouteComponentProps, useLocation } from 'react-router-dom';
import { WithPreferencesProps } from '../containers/withPreferences';
import { Paths } from '@shared/Paths';
import { joinLibraryRoute } from '../Util';
import { LangContext } from '../util/lang';
import { OpenIcon } from './OpenIcon';
import { WithSearchProps } from '@renderer/containers/withSearch';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import { updatePreferencesData } from '@shared/preferences/util';
import { WithViewProps } from '@renderer/containers/withView';
import { WithMainStateProps } from '@renderer/containers/withMainState';
import { DialogField, DialogState } from 'flashpoint-launcher';
import { uuid } from '@shared/utils/uuid';
import { WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';

const viewDragType = 'text/plain';

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

export type HeaderProps = OwnProps & RouteComponentProps & WithMainStateProps & WithConfirmDialogProps & WithPreferencesProps & WithTagCategoriesProps & WithSearchProps & WithViewProps;

type HeaderState = {};

/** The header that is always visible at the top of the main window (just below the title bar). */
export class Header extends React.Component<HeaderProps, HeaderState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  constructor(props: HeaderProps) {
    super(props);
  }

  onRenameView = async (view: string) => {
    let warning: string | undefined;
    while (true) {
      const name = await this.getUserInput('Enter View Name', warning);

      if (name !== '') {
        const views = Object.keys(this.props.search.views);
        if (views.includes(name)) {
          warning = 'Name already in use';
          continue;
        } else {
          // Change prefs
          const customViews = [...this.props.preferencesData.customViews];
          const customViewsIdx = this.props.preferencesData.customViews.findIndex(v => v === view);
          if (customViewsIdx > -1) {
            customViews[customViewsIdx] = name;
          } else {
            customViews.push(name);
          }
          const storedViews = [...this.props.preferencesData.storedViews.filter(s => s.view !== view)];
          const existingStoredView = this.props.preferencesData.storedViews.find(s => s.view === view);
          if (existingStoredView) {
            storedViews.push({
              ...existingStoredView,
              view: name
            });
          }
          if (this.props.preferencesData.defaultOpeningPage === joinLibraryRoute(view)) {
            updatePreferencesData({
              defaultOpeningPage: joinLibraryRoute(name)
            });
          }
          updatePreferencesData({
            customViews,
            storedViews,
          }, true);
          if (this.props.currentView.id === view) {
            // Move to LOADING page during change over
            this.props.history.push(Paths.LOADING);
            // Let the search action do the data swap
            this.props.searchActions.renameView({
              old: view,
              new: name,
            });
            setTimeout(() => {
              this.props.history.push(joinLibraryRoute(name));
            }, 200);
          } else {
            this.props.searchActions.renameView({
              old: view,
              new: name,
            });
          }
        }
      }

      break;
    }
  };

  onCreateNewView = async () => {
    let warning: string | undefined;
    while (true) {
      const name = await this.getUserInput('Enter View Name', warning);

      if (name !== '') {
        const views = Object.keys(this.props.search.views);
        if (views.includes(name)) {
          warning = 'Name already in use';
          continue;
        } else {
          // Add new view
          const customViews = [...this.props.preferencesData.customViews, name];
          updatePreferencesData({
            customViews,
          }, true);
          this.props.searchActions.addViews({
            views: [name]
          });
          setTimeout(() => {
            this.props.history.push(joinLibraryRoute(name));
          }, 200);
        }
      }

      break;
    }
  };

  onDragStart = (event: React.DragEvent<HTMLLIElement>, view: string) => {
    console.log(`dragged: ${view}`);
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.setData(viewDragType, view);
  };

  onDrop = (event: React.DragEvent<HTMLLIElement>, newView: string) => {
    const view = event.dataTransfer.getData(viewDragType);
    if (view) {
      console.log(`dropped: ${view}`);
      // Swap views
      const customViews = [...this.props.preferencesData.customViews];
      const oldIdx = customViews.findIndex(v => v === view);
      const newIdx = customViews.findIndex(v => v === newView);
      if (oldIdx > -1 && newIdx > -1) {
        customViews[oldIdx] = newView;
        customViews[newIdx] = view;
      }
      updatePreferencesData({
        customViews,
      });
    }
  };

  onDeleteView = async (view: string) => {
    const strings = this.context;
    // Confirm first
    const confirmation = await this.props.openConfirmDialog(
      strings.dialog.areYouSure,
      [strings.dialog.cancel, strings.misc.yes],
      0,
      1,
    );
    if (confirmation === 1) {
      if (this.props.currentView.id === view) {
        // Must move to the home tab first!
        this.props.history.push(Paths.HOME);
      }
      const customViews = this.props.preferencesData.customViews.filter(v => v !== view);
      const storedViews = this.props.preferencesData.storedViews.filter(v => v.view !== view);
      // Make sure the default page is always valid
      if (this.props.preferencesData.defaultOpeningPage === joinLibraryRoute(view)) {
        updatePreferencesData({
          defaultOpeningPage: Paths.HOME,
        });
      }
      updatePreferencesData({
        customViews: customViews,
        storedViews: storedViews,
      }, true);
      this.props.searchActions.deleteView({
        view: view
      });
    }
  };

  getUserInput = async (message: string, warning?: string, placeholder?: string): Promise<string> => {
    return new Promise<string>((resolve) => {
      const fields: DialogField[] = [];
      fields.push({
        type: 'string',
        name: 'name',
        value: placeholder || '',
      });
      if (warning) {
        fields.push({
          type: 'string',
          name: 'warning',
          locked: true,
          value: warning,
        });
      }
      const dialog: DialogState = {
        id: uuid(),
        largeMessage: true,
        userCanCancel: false,
        message: message,
        cancelId: 0,
        fields,
        buttons: ['Cancel', 'Confirm'],
      };
      this.props.mainActions.createDialog(dialog);
      window.Shared.dialogResEvent.once(dialog.id, (d: DialogState, value: number) => {
        if (value === 1 && d.fields) {
          const field = d.fields.find(f => f.name === 'name');
          if (field) {
            resolve(field.value as string);
          } else {
            resolve('');
          }
        } else {
          resolve('');
        }
      });
    });
  };

  render() {
    const strings = this.context.app;
    const {
      preferencesData: { browsePageShowLeftSidebar, browsePageShowRightSidebar, enableEditing, showDeveloperTab, onlineManual, offlineManual },
      onToggleLeftSidebarClick, onToggleRightSidebarClick
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
    const browseViews = this.props.preferencesData.useCustomViews ?
      Object.keys(this.props.search.views).filter(k => k !== GENERAL_VIEW_ID) :
      this.props.libraries;
    if (this.props.preferencesData.useCustomViews) {
      browseViews.sort((a, b) => {
        const aIdx = this.props.preferencesData.customViews.findIndex(v => v === a);
        const bIdx = this.props.preferencesData.customViews.findIndex(v => v === b);
        return aIdx - bIdx;
      });
    }
    return (
      <div className='header'>
        {/* Header Menu */}
        <div className='header__wrap'>
          <ul className='header__menu'>
            <MenuItem title={strings.home} link={Paths.HOME} />
            {
              this.props.preferencesData.useCustomViews ?
                browseViews.map(view => (
                  <MenuItem
                    key={view}
                    title={view}
                    onDragStart={(event) => this.onDragStart(event, view)}
                    onDrop={(event) => this.onDrop(event, view)}
                    link={joinLibraryRoute(view)}
                    onContextMenu={() => {
                      const contextButtons: MenuItemConstructorOptions[] = [
                        {
                          label: browseViews.length > 1 || view !== 'Browse' ? strings.deleteView : strings.deleteOnlyBrowseView,
                          enabled: browseViews.length > 1 ? true : view !== 'Browse',
                          click: () => this.onDeleteView(view),
                        },
                        {
                          label: 'Rename View',
                          click: () => this.onRenameView(view),
                        },
                      ];
                      const menu = remote.Menu.buildFromTemplate(contextButtons);
                      menu.popup({ window: remote.getCurrentWindow() });
                    }}/>
                )) :
                browseViews.map(view => (
                  <MenuItem
                    key={view}
                    title={getLibraryItemTitle(view, this.context.libraries)}
                    link={joinLibraryRoute(view)}/>
                ))
            }
            { this.props.preferencesData.useCustomViews && (
              <li className='header__menu__item' onClick={this.onCreateNewView} title={strings.createNewView}>
                <OpenIcon icon={'plus'}/>
              </li>
            )}
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
  onDragStart?: (event: React.DragEvent<HTMLLIElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLLIElement>) => void;
  onContextMenu?: () => void;
};

// An item in the header menu. Used as buttons to switch between tabs/pages.
function MenuItem({ title, link, onContextMenu, onDragStart, onDrop }: MenuItemProps) {
  const location = useLocation();
  const selected = link === '/' ? location.pathname === link : location.pathname.startsWith(link);
  const onDragOver = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
  };
  const onDragLeave = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
  };
  return (
    <li
      className='header__menu__item'
      onContextMenu={onContextMenu}
      draggable={onDragStart !== undefined}
      onDragStart={onDragStart}
      onDragOver={onDragStart !== undefined ? onDragOver : undefined}
      onDragLeave={onDragStart !== undefined ? onDragLeave : undefined}
      onDrop={onDrop}>
      <Link to={link} className={`header__menu__item__link ${selected ? 'header__menu__item__link-selected' : ''}`}>{title}</Link>
    </li>
  );
}
