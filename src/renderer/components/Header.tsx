import { createSelector } from '@reduxjs/toolkit';
import { getPointer } from '@renderer/context/MenuContext';
import { createNewDialog } from '@renderer/dialog';
import { useViewName } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useConfirmDialog } from '@renderer/hooks/useConfirmDialog';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { setUser } from '@renderer/store/fpfss/slice';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { addViews, deleteView, duplicateView, GENERAL_VIEW_ID, renameView } from '@renderer/store/search/slice';
import { RootState } from '@renderer/store/store';
import { getLibraryItemTitle } from '@shared/library/util';
import { Paths } from '@shared/Paths';
import { DialogFieldProps, DialogState, DialogStateTemplate } from 'flashpoint-launcher';
import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { joinLibraryRoute, openUrlInWindow } from '../Util';
import { LangContext } from '../util/lang';
import { MenuItemType } from './Menu';
import { OpenIcon } from './OpenIcon';

const viewDragType = 'text/plain';

const selectViewNames = createSelector(
  [
    (state: RootState) => state.preferences.useCustomViews,
    (state: RootState) => state.search.views,
    (state: RootState) => state.main.libraries,
  ],
  (useCustomViews, views, libraries) => useCustomViews ?
    Object.keys(views).filter(k => k !== GENERAL_VIEW_ID) :
    libraries
);

export function Header() {
  const browsePageShowRightSidebar = useAppSelector(state => state.preferences.browsePageShowRightSidebar);
  const browsePageShowLeftSidebar = useAppSelector(state => state.preferences.browsePageShowLeftSidebar);
  const useCustomViews = useAppSelector(state => state.preferences.useCustomViews);
  const customViews = useAppSelector(state => state.preferences.customViews);
  const storedViews = useAppSelector(state => state.preferences.storedViews);
  const defaultOpeningPage = useAppSelector(state => state.preferences.defaultOpeningPage);
  const loadViewsText = useAppSelector(state => state.preferences.loadViewsText);
  const hideNewViewButton = useAppSelector(state => state.preferences.hideNewViewButton);
  const enableEditing = useAppSelector(state => state.preferences.enableEditing);
  const fpfssBaseUrl = useAppSelector(state => state.preferences.fpfssBaseUrl);
  const onlineManual = useAppSelector(state => state.preferences.onlineManual);
  const offlineManual = useAppSelector(state => state.preferences.offlineManual);
  const fpfssUser = useAppSelector(state => state.fpfss.user);
  const playlists = useAppSelector(state => state.main.playlists);
  const { openMenu } = useContextMenu();
  const viewName = useViewName();
  const allStrings = useContext(LangContext);
  const strings = allStrings.app;
  const viewNames = useAppSelector(selectViewNames);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { confirmDialog, openConfirmDialog } = useConfirmDialog();

  const onToggleLeftSidebarClick = () => {
    dispatch(updatePreferences({
      browsePageShowLeftSidebar: !browsePageShowLeftSidebar
    }));
  };

  const onToggleRightSidebarClick = () => {
    dispatch(updatePreferences({
      browsePageShowRightSidebar: !browsePageShowRightSidebar
    }));
  };

  const logoutUser = () => {
    // @TODO actually logout to invalid server side
    dispatch(setUser(null));
    localStorage.removeItem('fpfss_user');
  };

  const getUserInput = async (message: string, warning?: string, placeholder?: string): Promise<string> => {
    return new Promise<string>((resolve) => {
      const fields: DialogFieldProps[] = [];
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
      const dialog: DialogStateTemplate = {
        largeMessage: true,
        userCanCancel: false,
        message: message,
        cancelId: 1,
        fields,
        buttons: ['Confirm', 'Cancel'],
      };
      const dialogId = createNewDialog(dispatch, dialog);
      window.Shared.dialogResEvent.once(dialogId, (d: DialogState, value: number) => {
        if (value === 0 && d.fields) {
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

  const onDuplicateView = async (view: string) => {
    let warning: string | undefined;
    while (true) {
      const name = await getUserInput('Enter Duplicate View Name', warning);

      if (name !== '') {
        if (name === view) {
          // Same name, just return and ignore user
          return;
        }
        if (viewNames.includes(name)) {
          warning = 'Name already in use';
          continue;
        } else {
          const newCustomViews = [...customViews];
          const customViewsIdx = newCustomViews.findIndex(v => v === name);
          if (customViewsIdx > -1) {
            newCustomViews[customViewsIdx] = name;
          } else {
            newCustomViews.push(name);
          }
          dispatch(updatePreferences({
            customViews: newCustomViews
          }));
          dispatch(duplicateView({
            oldView: view,
            view: name
          }));
          setTimeout(() => {
            const route = joinLibraryRoute(name);
            navigate(route);
          }, 50);
          return;
        }
      }
    }
  };

  const onRenameView = async (view: string) => {
    let warning: string | undefined;
    let name = view;
    while (true) {
      name = await getUserInput('Enter View Name', warning, name);

      if (name !== '') {
        if (name === view) {
          // Same name, just return and ignore user
          return;
        }
        if (viewNames.includes(name)) {
          warning = 'Name already in use';
          continue;
        } else {
          // Change prefs
          const newCustomViews = [...customViews];
          const customViewsIdx = customViews.findIndex(v => v === view);
          if (customViewsIdx > -1) {
            newCustomViews[customViewsIdx] = name;
          } else {
            newCustomViews.push(name);
          }
          const newStoredViews = [...storedViews.filter(s => s.view !== view)];
          const existingStoredView = newStoredViews.find(s => s.view === view);
          if (existingStoredView) {
            newStoredViews.push({
              ...existingStoredView,
              view: name
            });
          }
          if (defaultOpeningPage === joinLibraryRoute(view)) {
            dispatch(updatePreferences({
              defaultOpeningPage: joinLibraryRoute(name)
            }));
          }
          dispatch(updatePreferences({
            customViews: newCustomViews,
            storedViews: newStoredViews
          }));
          if (viewName === view) {
            // Move to LOADING page during change over
            navigate(Paths.LOADING);
            // Let the search action do the data swap
            dispatch(renameView({
              old: view,
              new: name
            }));
            setTimeout(() => {
              navigate(joinLibraryRoute(name));
            }, 200);
          } else {
            dispatch(renameView({
              old: view,
              new: name
            }));
          }
        }
      }

      break;
    }
  };

  const onCreateNewView = async () => {
    let warning: string | undefined;
    while (true) {
      const name = await getUserInput('Enter View Name', warning);

      if (name !== '') {
        if (viewNames.includes(name)) {
          warning = 'Name already in use';
          continue;
        } else {
          // Add new view
          const newCustomViews = [...customViews, name];
          dispatch(updatePreferences({
            customViews: newCustomViews
          }));
          dispatch(addViews({
            views: [name],
            areLibraries: false,
            loadViewsText,
            playlists,
          }));
          setTimeout(() => {
            navigate(joinLibraryRoute(name));
          }, 200);
        }
      }

      break;
    }
  };

  const onDeleteView = async (view: string) => {
    // Confirm first
    const confirmation = await openConfirmDialog(
      {
        message: allStrings.dialog.areYouSure,
        buttons: [allStrings.misc.yes, allStrings.dialog.cancel],
        cancelId: 1,
      }
    );
    if (confirmation === 0) {
      if (viewName === view) {
        // Must move to the home tab first!
        navigate(Paths.HOME);
      }
      const newCustomViews = customViews.filter(v => v !== view);
      const newStoredViews = storedViews.filter(v => v.view !== view);
      // Make sure the default page is always valid
      if (defaultOpeningPage === joinLibraryRoute(view)) {
        dispatch(updatePreferences({
          defaultOpeningPage: Paths.HOME,
        }));
      }
      dispatch(updatePreferences({
        customViews: newCustomViews,
        storedViews: newStoredViews
      }));
      dispatch(deleteView({
        view
      }));
      // Also make sure there's always one custom view in prefs
      if (customViews.length === 0) {
        dispatch(updatePreferences({
          customViews: ['Browse']
        }));
      }
    }
  };

  const onDragStart = (event: React.DragEvent<HTMLLIElement>, view: string) => {
    console.log(`dragged: ${view}`);
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.setData(viewDragType, view);
  };

  const onDrop = (event: React.DragEvent<HTMLLIElement>, newView: string) => {
    const view = event.dataTransfer.getData(viewDragType);
    if (view) {
      console.log(`dropped: ${view}`);
      // Swap views
      const newCustomViews = [...customViews];
      const oldIdx = newCustomViews.findIndex(v => v === view);
      const newIdx = newCustomViews.findIndex(v => v === newView);
      if (oldIdx > -1 && newIdx > -1) {
        newCustomViews[oldIdx] = newView;
        newCustomViews[newIdx] = view;
      }
      dispatch(updatePreferences({
        customViews: newCustomViews
      }));
    }
  };

  const fpfssContextMenu: MenuItemType[] = [
    {
      type: 'button',
      label: strings.fpfssProfile,
      enabled: true,
      onClick: () => {
        openUrlInWindow(`${fpfssBaseUrl}/web/profile`);
      }
    },
    {
      type: 'button',
      label: strings.fpfssLogout,
      enabled: true,
      onClick: logoutUser
    }
  ];

  const browseButtons = useCustomViews ?
    viewNames.map(view => (
      <HeaderMenuItem
        key={view}
        title={view}
        onDragStart={(event) => onDragStart(event, view)}
        onDrop={(event) => onDrop(event, view)}
        link={joinLibraryRoute(view)}
        onContextMenu={(event) => {
          const contextButtons: MenuItemType[] = [
            {
              type: 'button',
              label: strings.createNewView,
              onClick: onCreateNewView,
            },
            {
              type: 'button',
              label: strings.renameView,
              onClick: () => onRenameView(view),
            },
            {
              type: 'button',
              label: strings.duplicateView,
              onClick: () => onDuplicateView(view),
            },
            {
              type: 'button',
              label: viewNames.length > 1 || view !== 'Browse' ? strings.deleteView : strings.deleteOnlyBrowseView,
              enabled: viewNames.length > 1 ? true : view !== 'Browse',
              onClick: () => onDeleteView(view),
            },
          ];
          openMenu({ items: contextButtons }, getPointer(event));
        }}/>
    )) :
    viewNames.map(view => (
      <HeaderMenuItem
        key={view}
        title={getLibraryItemTitle(view, allStrings.libraries)}
        link={joinLibraryRoute(view)}/>
    ));

  return (
    <div className='header'>
      {confirmDialog}
      {/* Header Menu */}
      <div className='header__wrap'>
        <ul className='header__menu'>
          <HeaderMenuItem
            id={'header__home'}
            title={strings.home}
            link={Paths.HOME} />
          {browseButtons}
          { useCustomViews && !hideNewViewButton && (
            <li className='header__menu__item header__menu__item__icon' onClick={onCreateNewView} title={strings.createNewView}>
              <OpenIcon icon={'plus'}/>
            </li>
          )}
          { enableEditing ? (
            <>
              <HeaderMenuItem
                id={'header__tags'}
                title={strings.tags}
                link={Paths.TAGS} />
              <HeaderMenuItem
                id={'header__categories'}
                title={strings.categories}
                link={Paths.CATEGORIES} />
            </>
          ) : undefined }
          <HeaderMenuItem
            id={'header__downloads'}
            title={'Downloads'}
            link={Paths.DOWNLOADS} />
          <HeaderMenuItem
            id={'header__logs'}
            title={strings.logs}
            link={Paths.LOGS} />
          <HeaderMenuItem
            id={'header__config'}
            title={strings.config}
            link={Paths.CONFIG} />
          { (onlineManual || offlineManual) && (
            <HeaderMenuItem
              id={'header__manual'}
              title={strings.manual}
              link={Paths.MANUAL} />
          )}
          <HeaderMenuItem
            id={'header__about'}
            title={strings.about}
            link={Paths.ABOUT} />
          { enableEditing && (
            <HeaderMenuItem
              id={'header__curate'}
              title={strings.curate}
              link={Paths.CURATE} />
          )}
          { enableEditing && (fpfssBaseUrl !== undefined) && (
            <HeaderMenuItem
              id={'header__fpfss'}
              title={'FPFSS'}
              link={Paths.FPFSS} />
          )}
        </ul>
      </div>
      {/* Right-most portion */}
      <div className='header__wrap header__right'>
        {fpfssUser && (
          <div className='header-user-box' onClick={(event) => {
            openMenu({ items: fpfssContextMenu }, getPointer(event));
          }}>
            {/* FPFSS user status */}
            <div className='header-user-icon' style={{ backgroundImage: `url(${fpfssUser.avatarUrl})` }}></div>
            <div className='header-user-name'>{fpfssUser.username}</div>
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

type HeaderMenuItemType = {
  id?: string;
  title: string;
  link: string;
  onDragStart?: (event: React.DragEvent<HTMLLIElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLLIElement>) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
};

// An item in the header menu. Used as buttons to switch between tabs/pages.
function HeaderMenuItem({ id, title, link, onContextMenu, onDragStart, onDrop }: HeaderMenuItemType) {
  const location = useLocation();
  const selected = location.pathname.split('?')[0] === link;
  const onDragOver = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
  };
  const onDragLeave = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
  };

  return (
    <li
      id={id}
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
