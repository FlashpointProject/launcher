import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createNewDialog } from '@renderer/dialog';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { cancelDialog } from '@renderer/store/main/slice';
import { newAppPathOverride, newTagFilterGroup, removeAppPathOverride, removeTagFilterGroup, setLogoSet, setUseCustomViews, setUseStoredViews, toggleExcludedLibrary, toggleNativePlatform, updateAppPathOverride, updatePreferences, updateTagFilterGroup } from '@renderer/store/preferences/slice';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import { BackIn } from '@shared/back/types';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';
import { autoCode } from '@shared/lang';
import { Paths } from '@shared/Paths';
import { setTheme } from '@shared/Theme';
import { deepCopy } from '@shared/Util';
import * as Coerce from '@shared/utils/Coerce';
import { formatString } from '@shared/utils/StringFormatter';
import { AppPreferencesData, ExtConfigurationProp, ILogoSet, ITheme, LangContainer, TagFilterGroup } from 'flashpoint-launcher';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { clearFpfssConsentExt, getFpfssConsentExt, saveFpfssConsentExt } from '../../fpfss';
import {
  getExtIconURL,
  getExtremeIconURL,
  getPlatformIconURL,
  isFlashpointValidCheck,
  joinLibraryRoute
} from '../../Util';
import { CheckBox } from '../CheckBox';
import { ConfigBox, ConfigBoxInner } from '../ConfigBox';
import { ConfigBoxButton, ConfigBoxInnerButton } from '../ConfigBoxButton';
import { ConfigBoxCheckbox, ConfigBoxInnerCheckbox } from '../ConfigBoxCheckbox';
import { ConfigBoxInput } from '../ConfigBoxInput';
import { ConfigBoxMultiSelect } from '../ConfigBoxMultiSelect';
import { ConfigBoxSelect, SelectItem } from '../ConfigBoxSelect';
import { ConfigBoxSelectInput } from '../ConfigBoxSelectInput';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { FloatingContainer } from '../FloatingContainer';
import { InputField } from '../InputField';
import { OpenIcon } from '../OpenIcon';
import { SimpleButton } from '../SimpleButton';
import { TagFilterGroupEditor } from '../TagFilterGroupEditor';

const { num } = Coerce;

export function ConfigPage() {
  const allStrings = useLocalization();
  const strings = allStrings.config;
  const preferences = useAppSelector(state => state.preferences);
  const views = useAppSelector(state => Object.keys(state.search.views));
  const langList = useAppSelector(state => state.main.langList);
  const logoVersion = useAppSelector(state => state.main.logoVersion);
  const serverNames = useAppSelector(state => state.main.serverNames);
  const themeList = useAppSelector(state => state.main.themeList);
  const logoSets = useAppSelector(state => state.main.logoSets);
  const platforms = useAppSelector(state => state.main.suggestions.platforms);
  const libraries = useAppSelector(state => state.main.libraries);
  const extensions = useAppSelector(state => state.main.extensions);
  const extConfig = useAppSelector(state => state.main.extConfig);
  const extConfigs = useAppSelector(state => state.main.extConfigs);
  const tagCategories = useAppSelector(state => state.tagCategories);
  const dispatch = useAppDispatch();
  const [editingTagFilterGroupIdx, setEditingTagFilterGroupIdx] = useState<number>();
  const [editingTagFilterGroup, setEditingTagFilterGroup] = useState<TagFilterGroup>();
  const [flashpointPath, setFlashpointPath] = useState(window.Shared.config.fullFlashpointPath);
  const [isFlashpointPathValid, setIsFlashpointPathValid] = useState<boolean>();

  useEffect(() => {
    (async () => {
      const isValid = await isFlashpointValidCheck(flashpointPath);
      setIsFlashpointPathValid(isValid);
    })();
  }, [flashpointPath]);

  const [fpfssConsents, setFpfssConsents] = useState(extensions.reduce((map, ext) => {
    map[ext.id] = getFpfssConsentExt(ext.id);
    return map;
  }, {} as Record<string, boolean | undefined>));

  const getThemeName = (id: string) => {
    const theme = themeList.find(t => t.id === id);
    if (theme) { return theme.meta.name || theme.id; }
  };

  const getLogoSetName = (id: string) => {
    const logoSet = logoSets.find(ls => ls.id === id);
    if (logoSet) { return logoSet.name; }
  };

  const onSetPreferenceFactory = <K extends keyof AppPreferencesData>(key: K) => (value: AppPreferencesData[K]) => {
    dispatch(updatePreferences({
      [key]: value
    }));
  };

  const onSetPreferenceEventFactory = <K extends keyof AppPreferencesData>(key: K) => (event: React.ChangeEvent<any>) => {
    dispatch(updatePreferences({
      [key]: event.target.value
    }));
  };

  const onScreenshotPreviewDelayChange = (value: string) => {
    dispatch(updatePreferences({
      screenshotPreviewDelay: num(value)
    }));
  };

  const onSearchLimitChange = (value: string) => {
    dispatch(updatePreferences({
      searchLimit: num(value)
    }));
  };

  const defaultOpeningPageOptions = [
    {
      value: Paths.HOME,
      display: 'Home Page'
    },
    ...views.filter((view) => view !== GENERAL_VIEW_ID).map((view) => {
      return {
        value: joinLibraryRoute(view),
        display: !preferences.useCustomViews ? allStrings.libraries[view] || view : view,
      };
    })
  ];

  const searchLimitOptions =  [
    {
      value: '0',
      display: strings.searchLimitUnlimited
    },
    {
      value: '50',
      display: formatString(strings.searchLimitValue, '50') as string
    },
    {
      value: '100',
      display: formatString(strings.searchLimitValue, '100') as string
    },
    {
      value: '250',
      display: formatString(strings.searchLimitValue, '250') as string
    },
    {
      value: '500',
      display: formatString(strings.searchLimitValue, '500') as string
    },
    {
      value: '1000',
      display: formatString(strings.searchLimitValue, '1000') as string
    },
    {
      value: '2500',
      display: formatString(strings.searchLimitValue, '2500') as string
    },
    {
      value: '5000',
      display: formatString(strings.searchLimitValue, '5000') as string
    }
  ];

  const autoString = formatString(strings.auto, window.Shared.initialLocaleCode) as string;
  const langOptions: SelectItem<string>[] = [
    ...langList.map((lang) => {
      return {
        value: lang.code,
        display: lang.data.name ? `${lang.data.name} (${lang.code})` : lang.code
      };
    }),
    { value: '<none>', display: 'None' },
    { value: autoCode, display: autoString }
  ];

  const renderTagFilterGroupNuke = ({ confirm }: ConfirmElementArgs) => {
    return (
      <div
        className={'browse-right-sidebar__title-row__buttons__discard-button'}
        title={strings.nukeTagFilter}
        onClick={confirm} >
        <OpenIcon
          className='setting__row__content--override-row__delete'
          icon='trash' />
      </div>
    );
  };

  const renderTagFilterGroupDelete = ({ confirm }: ConfirmElementArgs) => {
    return (
      <div
        className={'browse-right-sidebar__title-row__buttons__discard-button'}
        title={strings.deleteTagFilter}
        onClick={confirm} >
        <OpenIcon
          className='setting__row__content--override-row__delete'
          icon='delete' />
      </div>
    );
  };

  const onStartEditingTagFilterGroup = (index: number) => {
    const tfg = preferences.tagFilters[index];
    if (tfg !== undefined) {
      setEditingTagFilterGroupIdx(index);
      setEditingTagFilterGroup(deepCopy(tfg));
    }
  };

  const onTagFilterGroupNuke = async (index: number) => {
    // Nuke all the tags
    const dialogId = createNewDialog(dispatch, {
      largeMessage: true,
      message: strings.nukeInProgress,
      buttons: [],
    });
    window.Shared.back.request(BackIn.NUKE_TAGS, preferences.tagFilters[index].tags)
    .then(() => {
      dispatch(removeTagFilterGroup(index));
    })
    .catch((error) => {
      alert('Failed to nuke tags: ' + error);
    })
    .finally(() => {
      dispatch(cancelDialog(dialogId));
    });
  };

  const tagFilterElements = preferences.tagFilters.map((item, index) => {
    if (preferences.browsePageShowExtreme ? true : !item.extreme) {
      return (
        <div
          className='setting__row__content--override-row'
          key={index}>
          { preferences.browsePageShowExtreme &&
            (item.extreme ? (
              <div
                key={index}
                className='config-page__tfg-extreme-logo'
                title={allStrings.browse.extreme}
                style={{ backgroundImage: `url('${getExtremeIconURL(logoVersion)}')` }} />
            ) : (item.iconBase64 ? (
              <div
                key={index}
                className='config-page__tfg-extreme-logo'
                title={allStrings.browse.tagFilterIcon}
                style={{ backgroundImage: `url("${item.iconBase64}")` }} />
            ) :
              (
                <div
                  key={index}
                  className='config-page__tfg-extreme-logo' />
              )))
          }
          <div
            title={item.enabled ? 'Hidden' : 'Visible'}
            className={`setting__row__content--tag-filter-eye setting__row__content--tag-filter-eye--${item.enabled ? 'hidden' : 'visible'}`}
            onClick={() => {
              dispatch(updateTagFilterGroup({
                index,
                data: {
                  enabled: !item.enabled
                }
              }));
            }}>
            <FontAwesomeIcon icon={item.enabled ? faEyeSlash : faEye} />
          </div>
          <div className='setting__row__content--tag-filter-text'>
            <InputField
              className='setting__row__content--tag-filter-title'
              text={item.name} />
            {item.description && (
              <InputField
                className='setting__row__content--tag-filter-description'
                text={item.description} />
            )}
          </div>
          <i className='setting__row__content--tag-filter-count'>
            {`${item.tags.length} Tags`}
          </i>
          <div
            onClick={() => onStartEditingTagFilterGroup(index)}
            title={strings.editTagFilter}
            className='browse-right-sidebar__title-row__buttons__edit-button'>
            <OpenIcon
              className='setting__row__content--override-row__edit'
              icon='pencil' />
          </div>
          <div
            onClick={() => dispatch(newTagFilterGroup(deepCopy(preferences.tagFilters[index])))}
            title={strings.duplicateTagFilter}
            className='browse-right-sidebar__title-row__buttons__edit-button'>
            <OpenIcon
              className='setting__row__content--override-row__edit'
              icon='layers' />
          </div>
          <ConfirmElement
            message={allStrings.dialog.nukeTagFilterGroup}
            onConfirm={() => onTagFilterGroupNuke(index)}
            render={renderTagFilterGroupNuke} />
          <ConfirmElement
            message={allStrings.dialog.deleteTagFilterGroup}
            onConfirm={() => dispatch(removeTagFilterGroup(index))}
            render={renderTagFilterGroupDelete} />
        </div>
      );
    }
  });

  const renderClearPlaytimeButton = ({ confirm, extra }: ConfirmElementArgs<[LangContainer['config']]>) => {
    return (
      <SimpleButton
        className='setting__row__button'
        value={extra[0].clearData}
        onClick={confirm}/>
    );
  };

  const getLogoSetPreviews = () => {
    const allRows: React.JSX.Element[] = [];
    const toRender = [...platforms, 'Extreme'];
    // Render 16 logos per row, vertically stacked
    for (let i = 0; i < toRender.length; i = i + 16) {
      const slice = toRender.slice(i, i+16);
      allRows.push(
        <div
          className='config-page__logo-row'
          key={i} >
          { slice.map((platform, index) =>
            <div
              key={index}
              className='config-page__logo-row__logo'
              title={platform}
              style={{ backgroundImage: `url('${getPlatformIconURL(platform, logoVersion)}')` }} />
          ) }
        </div>
      );
    }
    return allRows;
  };

  const serverOptions = serverNames.map((name) => {
    return {
      value: name
    };
  });

  const onOptimizeDatabase = () => {
    window.Shared.back.request(BackIn.OPTIMIZE_DATABASE)
    .catch((err) => {
      alert('Error: ' + err);
    });
  };

  const onRegisterProtocol = (isChecked: boolean): void => {
    dispatch(updatePreferences({
      registerProtocol: isChecked
    }));
    window.electronAPI?.registerProtocol(isChecked);
  };

  const onCurrentThemeChange = (value: string): void => {
    const selectedTheme = themeList.find(t => t.id === value);
    if (selectedTheme) {
      const suggestedLogoSet = logoSets.find(ls => ls.id === selectedTheme.logoSet);
      const logoSetId = suggestedLogoSet ? suggestedLogoSet.id : preferences.currentLogoSet;
      dispatch(updatePreferences({
        currentTheme: selectedTheme.id,
        currentLogoSet: logoSetId
      }));
      setTheme(selectedTheme);
    }
  };

  const onCurrentThemeItemSelect = (value: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered themes.
    //       Directly after that comes the "No Theme" suggestion.
    let theme: ITheme | undefined;
    if (index < themeList.length) { // (Select a Theme)
      theme = themeList[index];
    } else { theme = undefined; } // (Deselect the current theme)
    onCurrentThemeChange(theme?.id || '');
  };

  const onCurrentLogoSetSelect = (value: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered logo sets.
    //       Directly after that comes the "No Theme" suggestion.
    let logoSet: ILogoSet | undefined;
    if (index < logoSets.length) { // (Select a Logo Set)
      logoSet = logoSets[index];
    } else { logoSet = undefined; } // (Deselect the current logo set)
    dispatch(setLogoSet(logoSet?.id));
  };

  const onClearPlaytimeTracking = () => {
    window.Shared.back.request(BackIn.CLEAR_PLAYTIME_TRACKING);
  };

  const screenshotPreviewModes = [
    {
      value: ScreenshotPreviewMode.OFF,
      display: strings.screenshotPreviewModeOff
    },
    {
      value: ScreenshotPreviewMode.ON,
      display: strings.screenshotPreviewModeOn
    },
    {
      value: ScreenshotPreviewMode.ALWAYS,
      display: strings.screenshotPreviewModeAlways
    }
  ];

  const libraryOptions = libraries.map(library => {
    return {
      value: library,
      display: allStrings.libraries[library] || library,
      checked: !preferences.excludedRandomLibraries.includes(library)
    };
  });

  const platformOptions = platforms.map(platform => {
    return {
      value: platform,
      checked: preferences.nativePlatforms.includes(platform)
    };
  });

  const appPathOverridesRows = preferences.appPathOverrides.map((item, index) => {
    return (
      <div
        className='setting__row__content--override-row'
        key={index}>
        <CheckBox
          checked={item.enabled}
          onToggle={(checked) => {
            dispatch(updateAppPathOverride({
              index,
              data: {
                enabled: checked
              }
            }));
          }}/>
        <InputField
          editable={true}
          onChange={(event) => {
            dispatch(updateAppPathOverride({
              index,
              data: {
                path: event.target.value
              }
            }));
          }}
          text={item.path} />
        <div
          className='setting__row__content--override-row__separator'>
          {'->'}
        </div>
        <InputField
          editable={true}
          onChange={(event) => {
            dispatch(updateAppPathOverride({
              index,
              data: {
                override: event.target.value
              }
            }));
          }}
          text={item.override} />
        <div
          onClick={() => dispatch(removeAppPathOverride(index))}
          className='setting__row__content--remove-app-override'>
          <OpenIcon
            className='setting__row__content--override-row__delete'
            icon='delete' />
        </div>
      </div>
    );
  });

  const extensionConfigBoxes = extConfigs.map((contrib, idx) => {
    return contrib.value.map((config, configIdx) => {
      const propBoxes = [];
      for (const key in config.properties) {
        const configRender = renderExtConfigProp(key, config.properties[key], extConfig[key]);
        if (configRender) { propBoxes.push(renderExtConfigProp(key, config.properties[key], extConfig[key])); }
      }
      if (propBoxes.length > 0) {
        return (
          <div
            className='setting'
            key={`${idx}_${configIdx}`}>
            <p className='setting__title'>{config.title}</p>
            <div className='setting__body'>
              {propBoxes}
            </div>
          </div>
        );
      }
    }).filter(p => !!p) as React.JSX.Element[];
  });

  const onExtFPFSSConsentChange = (extId: string, action: string): void => {
    const updatedConsent = action === 'grant' ? true : undefined;
    if (updatedConsent) {
      saveFpfssConsentExt(extId, true);
    } else if (action === 'revoke') {
      clearFpfssConsentExt(extId);
    }

    const newMap = { ...fpfssConsents };
    newMap[extId] = updatedConsent;
    setFpfssConsents(newMap);
  };

  const extensionRows = extensions.map((ext) => {
    const fpfssConsent = fpfssConsents[ext.id];
    const enabled = !preferences.disabledExtensions.includes(ext.id);

    const shortContribs = [];
    if (ext.contributes) {
      if (ext.contributes.devScripts && ext.contributes.devScripts.length > 0) {
        shortContribs.push(
          <div key='devScripts'>
            {`${ext.contributes.devScripts.length} ${strings.extDevScripts}`}
          </div>
        );
      }
      if (ext.contributes.themes && ext.contributes.themes.length > 0) {
        shortContribs.push(
          <div key='themes'>
            {`${ext.contributes.themes.length} ${strings.extThemes}`}
          </div>
        );
      }
      if (ext.contributes.logoSets && ext.contributes.logoSets.length > 0) {
        shortContribs.push(
          <div key='logoSets'>
            {`${ext.contributes.logoSets.length} ${strings.extLogoSets}`}
          </div>
        );
      }
      if (ext.contributes.applications && ext.contributes.applications.length > 0) {
        shortContribs.push(
          <div key='applications'>
            {`${ext.contributes.applications.length} ${strings.extApplications}`}
          </div>
        );
      }
    }
    return (
      <div key={ext.id} className='setting__row'>
        <div className='setting__row__top'>
          <div className='setting__row__title setting__row__title--flex setting__row__title--align-left'>
            { ext.icon ? (
              <div
                style={{ backgroundImage: `url(${getExtIconURL(ext.id)})` }}
                className='setting__row__ext-icon' />
            ): undefined }
            <div>
              <div>{ext.displayName || ext.name}</div>
              <div>{ext.author}</div>
            </div>
          </div>
          <div className='setting__row__content setting__row__content--right-align'>
            {shortContribs}
          </div>
        </div>
        <div className='setting__row__bottom setting__row__description'>
          <p>{ext.description}</p>
        </div>
        <div className='setting__row__content setting__row__content--right-align'>
          <CheckBox
            onToggle={(isChecked) => {
              window.Shared.back.request(BackIn.SET_EXTENSION_ENABLED, ext.id, isChecked)
              .then(() => {
                if (enabled) {
                  dispatch(updatePreferences({
                    disabledExtensions: preferences.disabledExtensions.concat([ext.id])
                  }));
                } else {
                  dispatch(updatePreferences({
                    disabledExtensions: preferences.disabledExtensions.filter(c => c !== ext.id)
                  }));
                }
              });
            }}
            checked={enabled}/>
        </div>
        <div className='setting__row__content setting__extension__config_row'>
          {(fpfssConsent === true) ? (
            <ConfigBoxInnerButton
              title={allStrings.extensions.fpssConsentRevokeTitle}
              description={allStrings.extensions.fpssConsentRevokeDesc}
              value={allStrings.curate.delete}
              onClick={() => onExtFPFSSConsentChange(ext.id, 'revoke')} />
          ) : undefined }
        </div>
      </div>
    );
  });

  const onEditTagFilterGroup = <K extends keyof TagFilterGroup>(key: K) => (value: TagFilterGroup[K]) => {
    if (editingTagFilterGroup) {
      editingTagFilterGroup[key] = value;
    }
  };

  const onAddTagEditorTagEvent = (tag: string): void => {
    if (editingTagFilterGroup) {
      const newTFG = deepCopy(editingTagFilterGroup);
      newTFG.tags.push(tag);
      setEditingTagFilterGroup(newTFG);
    }
  };

  const onRemoveTagEditorTagEvent = (tag: string): void => {
    if (editingTagFilterGroup) {
      const newTFG = deepCopy(editingTagFilterGroup);
      const idx = newTFG.tags.findIndex(t => t === tag);
      if (idx > -1) {
        newTFG.tags.splice(idx, 1);
      }
      setEditingTagFilterGroup(newTFG);
    }
  };

  const onSaveAndRestartClick = () => {
    // Save new config to file, then restart the app
    window.Shared.back.request(BackIn.UPDATE_CONFIG, {
      flashpointPath,
    }).then(() => {
      if (window.electronAPI !== undefined) {
        window.electronAPI.relaunch();
      } else {
        window.location.reload();
      }
    });
  };


  return (
    <div className='config-page simple-scroll'>
      <div className='config-page__inner'>
        <h1 className='config-page__title'>{strings.configHeader}</h1>
        <p className='config-page__description'>{strings.configDesc}</p>

        {/* -- Preferences -- */}
        <div className='setting'>
          <p className='setting__title'>{strings.preferencesHeader}</p>
          <div className='setting__body'>
            {/* Restore Search Views */}
            <ConfigBoxCheckbox
              title={strings.restoreSearchViews}
              description={strings.restoreSearchViewsDesc}
              checked={preferences.useStoredViews}
              onToggle={(value) => dispatch(setUseStoredViews(value))} />
            {/* Use Custom Search Views */}
            <ConfigBoxCheckbox
              title={strings.useCustomViews}
              description={strings.useCustomViewsDesc}
              checked={preferences.useCustomViews}
              onToggle={(value) => dispatch(setUseCustomViews(value))} />
            {/* Load Views Text on restart */}
            <ConfigBoxCheckbox
              title={strings.loadViewsText}
              description={strings.loadViewsTextDesc}
              checked={preferences.loadViewsText}
              onToggle={onSetPreferenceFactory('loadViewsText')} />
            {/* Default opening page */}
            <ConfigBoxSelect
              title={strings.defaultOpeningPage}
              description={strings.defaultOpeningPageDesc}
              value={preferences.defaultOpeningPage}
              onChange={onSetPreferenceEventFactory('defaultOpeningPage')}
              items={defaultOpeningPageOptions} />
            {/* Use selected game scroll instead of scroll top pos */}
            {/* <ConfigBoxCheckbox
              title={strings.useSelectedGameScroll}
              description={strings.useSelectedGameScrollDesc}
              checked={this.props.preferencesData.useSelectedGameScroll}
              onToggle={this.onToggleUseSelectedGameScroll} /> */}
            {/* Enable Editing */}
            <ConfigBoxCheckbox
              title={strings.enableEditing}
              description={strings.enableEditingDesc}
              checked={preferences.enableEditing}
              onToggle={onSetPreferenceFactory('enableEditing')} />
            {/** Symlink Curation Content */}
            { preferences.enableEditing && (
              <ConfigBoxCheckbox
                title={strings.symlinkCuration}
                description={strings.symlinkCurationDesc}
                checked={preferences.symlinkCurationContent}
                onToggle={onSetPreferenceFactory('symlinkCurationContent')}/>
            )}
            {/* On Demand Images */}
            <ConfigBox
              title={strings.onDemandImages}
              description={strings.onDemandImagesDesc}
              swapChildren={true} >
              <ConfigBoxInnerCheckbox
                title={strings.onDemandImagesEnabled}
                description={strings.onDemandImagesEnabledDesc}
                checked={preferences.onDemandImages}
                onToggle={onSetPreferenceFactory('onDemandImages')} />
              <ConfigBoxInnerCheckbox
                title={strings.onDemandImagesCompressed}
                description={strings.onDemandImagesCompressedDesc}
                checked={preferences.onDemandImagesCompressed}
                onToggle={onSetPreferenceFactory('onDemandImagesCompressed')} />
              <ConfigBoxInnerButton
                title={strings.onDemandImagesDelete}
                description={strings.onDemandImagesDeleteDesc}
                value={allStrings.curate.delete}
                onClick={() => {
                  window.Shared.back.request(BackIn.DELETE_ALL_IMAGES)
                  .then(() => {
                    toast('Images Deleted');
                  })
                  .catch((err) => {
                    alert('Error: ' + err);
                  });
                }}/>
            </ConfigBox>
            {/* Playtime Tracking */}
            <ConfigBox
              title={strings.playtimeTracking}
              description={strings.playtimeTrackingDesc}
              swapChildren={true}>
              <ConfigBoxInnerCheckbox
                title={strings.enablePlaytimeTracking}
                description={strings.enablePlaytimeTrackingDesc}
                checked={preferences.enablePlaytimeTracking}
                onToggle={onSetPreferenceFactory('enablePlaytimeTracking')} />
              <ConfigBoxInnerCheckbox
                title={strings.enablePlaytimeTrackingExtreme}
                description={strings.enablePlaytimeTrackingExtremeDesc}
                checked={preferences.enablePlaytimeTrackingExtreme}
                onToggle={onSetPreferenceFactory('enablePlaytimeTrackingExtreme')} />
              <ConfigBoxInner
                title={strings.clearPlaytimeTracking}
                description={strings.clearPlaytimeTrackingDesc}>
                <ConfirmElement
                  render={renderClearPlaytimeButton}
                  onConfirm={onClearPlaytimeTracking}
                  message={allStrings.dialog.confirmClearPlaytime}
                  extra={[strings]}/>
              </ConfigBoxInner>
            </ConfigBox>
            {/* Fancy Animations */}
            <ConfigBoxCheckbox
              title={strings.fancyAnimations}
              description={strings.fancyAnimationsDesc}
              checked={preferences.fancyAnimations}
              onToggle={onSetPreferenceFactory('fancyAnimations')} />
            {/* Hide New View Button */}
            <ConfigBoxCheckbox
              title={strings.hideNewViewButton}
              description={strings.hideNewViewButtonDesc}
              checked={preferences.hideNewViewButton}
              onToggle={onSetPreferenceFactory('hideNewViewButton')} />
            {/* Short Search */}
            <ConfigBoxSelect
              title={strings.searchLimit}
              description={strings.searchLimitDesc}
              value={preferences.searchLimit.toString()}
              onChange={(event) => onSearchLimitChange(event.target.value)}
              items={searchLimitOptions}/>
            {/* Current Language */}
            <ConfigBoxSelect
              title={strings.currentLanguage}
              description={strings.currentLanguageDesc}
              value={preferences.currentLanguage || ''}
              onChange={onSetPreferenceEventFactory('currentLanguage')}
              items={langOptions} />
            {/* Screenshot Preview Mode */}
            <ConfigBoxSelect
              title={strings.screenshotPreviewMode}
              description={strings.screenshotPreviewModeDesc}
              value={preferences.screenshotPreviewMode}
              items={screenshotPreviewModes}
              onChange={onSetPreferenceEventFactory('screenshotPreviewMode')}
            />
            <ConfigBoxSelectInput
              title={strings.screenshotPreviewDelay}
              description={strings.screenshotPreviewDelayDesc}
              editable={true}
              text={preferences.screenshotPreviewDelay.toString()}
              placeholder='250'
              onChange={onScreenshotPreviewDelayChange}
              onItemSelect={onScreenshotPreviewDelayChange}
              items={['0', '150', '250', '350', '500', '750', '1000']}/>
          </div>
        </div>
        {/* -- Content Filters -- */}
        <div className='setting'>
          <p className='setting__title'>{strings.contentFiltersHeader}</p>
          <div className='setting__body'>
            {/* Show Extreme Games */}
            {((!preferences.disableExtremeGames)) ? (
              <ConfigBoxCheckbox
                title={strings.extremeGames}
                description={strings.extremeGamesDesc}
                checked={preferences.browsePageShowExtreme}
                onToggle={onSetPreferenceFactory('browsePageShowExtreme')} />
            ) : undefined }
            {preferences.browsePageShowExtreme && (
              <ConfigBoxCheckbox
                title={strings.hideExtremeScreenshots}
                description={strings.hideExtremeScreenshotsDesc}
                checked={preferences.hideExtremeScreenshots}
                onToggle={onSetPreferenceFactory('hideExtremeScreenshots')} />
            )}
            {/* Tag Filter Groups */}
            <ConfigBox
              title={strings.tagFilterGroups}
              description={strings.tagFilterGroupsDesc}
              swapChildren={true}>
              {tagFilterElements}
              <div
                onClick={() => dispatch(newTagFilterGroup())}
                className='setting__row__content--override-row__new'>
                <OpenIcon
                  icon='plus' />
              </div>
            </ConfigBox>
            {/* Random Libraries */}
            <ConfigBoxMultiSelect
              title={strings.randomLibraries}
              description={strings.randomLibrariesDesc}
              text={strings.libraries}
              onChange={(item) => dispatch(toggleExcludedLibrary(item))}
              items={libraryOptions} />
          </div>
        </div>
        {/* -- Flashpoint -- */}
        <div className='setting'>
          <p className='setting__title'>{strings.flashpointHeader}</p>
          <div className='setting__body'>
            {/* Flashpoint Path */}
            <ConfigBox
              title={strings.flashpointPath}
              description={strings.flashpointPathDesc}
              contentClassName='setting__row__content--filepath-path'>
              <ConfigFlashpointPathInput
                input={flashpointPath}
                buttonText={strings.browse}
                onInputChange={setFlashpointPath}
                isValid={isFlashpointPathValid} />
            </ConfigBox>
            {/* Native Platforms */}
            <ConfigBoxMultiSelect
              title={strings.nativePlatforms}
              description={strings.nativePlatformsDesc}
              text={strings.platforms}
              onChange={(item) => dispatch(toggleNativePlatform(item))}
              items={platformOptions} />
            {/* App Path Overrides */}
            <ConfigBox
              title={strings.appPathOverrides}
              description={strings.appPathOverridesDesc}
              swapChildren={true} >
              {appPathOverridesRows}
              <div
                onClick={() => dispatch(newAppPathOverride())}
                className='setting__row__content--override-row__new'>
                <OpenIcon
                  icon='plus' />
              </div>
            </ConfigBox>
            {/* Verbose Logging */}
            <ConfigBoxCheckbox
              title={strings.enableVerboseLogging}
              description={strings.enableVerboseLoggingDesc}
              checked={preferences.enableVerboseLogging}
              onToggle={onSetPreferenceFactory('enableVerboseLogging')} />
          </div>
        </div>

        {/* -- Visuals -- */}
        <div className='setting'>
          <p className='setting__title'>{strings.visualsHeader}</p>
          <div className='setting__body'>
            <ConfigBoxCheckbox
              title={strings.useCustomTitleBar}
              description={strings.useCustomTitleBarDesc}
              checked={preferences.useCustomTitlebar}
              onToggle={onSetPreferenceFactory('useCustomTitlebar')}/>
            {/* Theme */}
            <ConfigBoxSelectInput
              title={strings.theme}
              description={strings.themeDesc}
              text={getThemeName(preferences.currentTheme || '') || ''}
              placeholder={strings.noTheme}
              editable={true}
              items={[ ...themeList.map(formatThemeItemName), 'No Theme' ]}
              onChange={onCurrentThemeChange}
              onItemSelect={onCurrentThemeItemSelect}/>
            {/* Logo Set */}
            <ConfigBoxSelectInput
              title={strings.logoSet}
              description={strings.logoSetDesc}
              text={getLogoSetName(preferences.currentLogoSet || '') || ''}
              placeholder={strings.noLogoSet}
              editable={true}
              items={[ ...logoSets.map(formatLogoSetName), 'No Logo Set' ]}
              onChange={onSetPreferenceFactory('currentLogoSet')}
              onItemSelect={onCurrentLogoSetSelect}
              bottomChildren={getLogoSetPreviews()}/>
          </div>
        </div>

        {/* -- Advanced -- */}
        <div className='setting'>
          <p className='setting__title'>{strings.advancedHeader}</p>
          <div className='setting__body'>
            {/* Auto-Clear WinINet Cache */}
            {/* {process.platform === 'win32' && (
              <ConfigBoxCheckbox
                title={strings.autoClearWininetCache}
                description={strings.autoClearWininetCacheDesc}
                value={allStrings.curate.run}
                onToggle={this.onChangeAutoClearWininetCache}/>
            )} */}
            {/* Clear WinINet Cache */}
            {/* {process.platform === 'win32' && (
              <ConfigBoxButton
                title={strings.clearWininetCache}
                description={strings.clearWininetCacheDesc}
                value={allStrings.curate.run}
                onClick={this.onClearWininetCache}/>
            )} */}
            {/* Optimize Database */}
            <ConfigBoxButton
              title={strings.optimizeDatabase}
              description={strings.optimizeDatabaseDesc}
              value={allStrings.curate.run}
              onClick={onOptimizeDatabase}/>
            {/* Register As Protocol Handler */}
            { window.electronAPI !== undefined && (
              <ConfigBoxCheckbox
                title={strings.registerProtocol}
                description={strings.registerProtocolDesc}
                checked={preferences.registerProtocol}
                onToggle={onRegisterProtocol} />
            )}
            {/* Server */}
            <ConfigBoxSelect
              title={strings.server}
              description={strings.serverDesc}
              value={preferences.server}
              onChange={onSetPreferenceEventFactory('server')}
              items={serverOptions} />
            {preferences.enableEditing && (
              <ConfigBoxSelect
                title={strings.curateServer}
                description={strings.curateServerDesc}
                value={preferences.curateServer}
                onChange={onSetPreferenceEventFactory('curateServer')}
                items={serverOptions} />
            )}
            {/* Fallback Language */}
            <ConfigBoxSelect
              title={strings.fallbackLanguage}
              description={strings.fallbackLanguageDesc}
              value={preferences.fallbackLanguage || ''}
              onChange={onSetPreferenceEventFactory('fallbackLanguage')}
              items={langOptions} />
          </div>
        </div>

        {/* -- Advanced -- */}

        {extensionConfigBoxes}

        <div className='setting extensions'>
          <p className='setting__title'>{strings.extensionsHeader}</p>
          { extensions.length > 0 ? (
            <div className='setting__body'>
              {extensionRows}
            </div>
          ) : <div>{formatString(strings.noExtensionsLoaded, preferences.extensionsPath)}</div>}
        </div>

        {/* -- Save & Restart -- */}
        <div className='setting'>
          <div className='setting__row'>
            <input
              type='button'
              value={strings.saveAndRestart}
              className='simple-button save-and-restart'
              onClick={onSaveAndRestartClick} />
          </div>
        </div>
      </div>
      { editingTagFilterGroup !== undefined && editingTagFilterGroupIdx !== undefined && (
        <FloatingContainer>
          <TagFilterGroupEditor
            tagFilterGroup={editingTagFilterGroup}
            onAddTag={(tag) => onAddTagEditorTagEvent(tag)}
            onRemoveTag={(tag) => onRemoveTagEditorTagEvent(tag)}
            onChangeName={onEditTagFilterGroup('name')}
            onChangeDescription={onEditTagFilterGroup('description')}
            onChangeIconBase64={onEditTagFilterGroup('iconBase64')}
            onToggleExtreme={onEditTagFilterGroup('extreme')}
            closeEditor={() => {
              setEditingTagFilterGroup(undefined);
              setEditingTagFilterGroupIdx(undefined);
            }}
            showExtreme={preferences.browsePageShowExtreme}
            tagCategories={tagCategories}
            activeTagFilterGroups={preferences.tagFilters.filter((tfg, index) => (tfg.enabled || (tfg.extreme && !preferences.browsePageShowExtreme)) && index != editingTagFilterGroupIdx)} />
        </FloatingContainer>
      )}
    </div>
  );
}

function setExtConfigValue(key: string, value: any): void {
  return window.Shared.back.send(BackIn.SET_EXT_CONFIG_VALUE, key, value);
}

function renderExtConfigProp(key: string, prop: ExtConfigurationProp, value: any): React.JSX.Element | undefined {
  switch (prop.type) {
    case 'button': {
      return (
        <ConfigBoxButton
          key={key}
          title={prop.title}
          description={prop.description}
          value='Run'
          onClick={() => {
            window.Shared.back.request(BackIn.RUN_COMMAND, prop.command || '')
            .catch((error) => {
              log.error('Launcher', `Failed to run Ext Config command '${prop.command}': ${error}`);
            });
          }}/>
      );
    }
    case 'boolean':
      return (
        <ConfigBoxCheckbox
          key={key}
          title={prop.title}
          description={prop.description}
          checked={!!value}
          onToggle={checked => setExtConfigValue(key, checked)}/>
      );
    case 'string': {
      if (prop.enum.length > 0) {
        return (
          <ConfigBoxSelect
            key={key}
            title={prop.title}
            description={prop.description}
            value={value}
            items={itemizeExtEnums(prop.enum)}
            onChange={event => setExtConfigValue(key, event.target.value)} />
        );
      } else {
        return (
          <ConfigBoxInput
            key={key}
            title={prop.title}
            description={prop.description}
            text={value}
            editable={true}
            onChange={event => setExtConfigValue(key, event.target.value)} />
        );
      }
    }
  }
}

/**
 * Format a theme item into a displayable name for the themes drop-down.
 *
 * @param item Theme item to format
 */
function formatThemeItemName(item: ITheme): string {
  return `${item.meta.name} (${item.id})`;
}

function formatLogoSetName(item: ILogoSet): string {
  return `${item.name} (${item.id})`;
}

function itemizeExtEnums(enums: string[]): SelectItem<string>[] {
  return enums.map(e => {
    return {
      value: e
    };
  });
}
