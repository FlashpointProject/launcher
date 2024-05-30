import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { BackIn } from '@shared/back/types';
import { AppExtConfigData } from '@shared/config/interfaces';
import { CustomIPC } from '@shared/interfaces';
import { ipcRenderer } from 'electron';
import { ExtConfigurationProp, ExtensionContribution, IExtensionDescription, ILogoSet } from '@shared/extensions/interfaces';
import { autoCode, LangContainer, LangFile } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData, updatePreferencesDataAsync } from '@shared/preferences/util';
import { ITheme } from '@shared/ThemeFile';
import { deepCopy } from '@shared/Util';
import { formatString } from '@shared/utils/StringFormatter';
import { AppPathOverride, TagFilterGroup } from 'flashpoint-launcher';
import * as React from 'react';
import {getExtIconURL, getExtremeIconURL, getPlatformIconURL, isFlashpointValidCheck} from '../../Util';
import { LangContext } from '../../util/lang';
import { CheckBox } from '../CheckBox';
import { ConfigBox, ConfigBoxInner } from '../ConfigBox';
import { ConfigBoxButton, ConfigBoxInnerButton } from '../ConfigBoxButton';
import { ConfigBoxCheckbox, ConfigBoxInnerCheckbox } from '../ConfigBoxCheckbox';
import { ConfigBoxInput } from '../ConfigBoxInput';
import { ConfigBoxMultiSelect, MultiSelectItem } from '../ConfigBoxMultiSelect';
import { ConfigBoxSelect, SelectItem } from '../ConfigBoxSelect';
import { ConfigBoxSelectInput } from '../ConfigBoxSelectInput';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { FloatingContainer } from '../FloatingContainer';
import { InputField } from '../InputField';
import { OpenIcon } from '../OpenIcon';
import { TagFilterGroupEditor } from '../TagFilterGroupEditor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import * as Coerce from '@shared/utils/Coerce';
import { Spinner } from '../Spinner';
import { SimpleButton } from '../SimpleButton';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';

const { num } = Coerce;

type OwnProps = {
  /** List of all game libraries */
  libraries: string[];
  /** List of all platforms */
  platforms: string[];
  /** List of all available themes */
  themeList: ITheme[];
  /** List of all available logo sets */
  logoSets: ILogoSet[];
  /** Version of logos to render */
  logoVersion: number;
  /** List of available languages. */
  availableLangs: LangFile[];
  /** List of available server names. */
  serverNames: string[];
  /** All available extensions */
  extensions: IExtensionDescription[];
  /** All available extension configurations */
  extConfigs: ExtensionContribution<'configuration'>[];
  /** Current extension config data */
  extConfig: AppExtConfigData;
  localeCode: string;
};

export type ConfigPageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps;

type ConfigPageState = {
  /** If the currently entered Flashpoint path points to a "valid" Flashpoint folder (it exists and "looks" like a Flashpoint folder). */
  isFlashpointPathValid?: boolean;
  /** Currently entered Flashpoint path. */
  flashpointPath: string;
  /** If the "use custom title bar" checkbox is checked. */
  useCustomTitlebar: boolean;
  /** Currently editable Tag Filter Group */
  editingTagFilterGroupIdx?: number;
  editingTagFilterGroup?: TagFilterGroup;
  editorOpen: boolean;
  /** Progress for nuking tags */
  nukeInProgress: boolean;
};

/**
 * A page displaying some of the current "configs" / "preferences", as well as a way of changing them.
 * All changed "configs" (settings stored in "config.json") require you to "Save & Restart" to take effect.
 * The changed "preferences" (settings stored in "preferences.json") do not require a restart, and are updated directly.
 */
export class ConfigPage extends React.Component<ConfigPageProps, ConfigPageState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  constructor(props: ConfigPageProps) {
    super(props);
    const configData = window.Shared.config.data;
    this.state = {
      isFlashpointPathValid: undefined,
      flashpointPath: configData.flashpointPath,
      useCustomTitlebar: configData.useCustomTitlebar,
      editorOpen: false,
      nukeInProgress: false
    };
  }

  render() {
    const allStrings = this.context;
    const strings = this.context.config;
    const autoString = formatString(strings.auto, this.props.localeCode);
    const searchLimitOptions = this.itemizeSearchLimitOptionsMemo(this.context.config);
    const langOptions = this.itemizeLangOptionsMemo(this.props.availableLangs, autoString as string);
    const serverOptions = this.itemizeServerOptionsMemo(this.props.serverNames);
    const libraryOptions = this.itemizeLibraryOptionsMemo(this.props.libraries, this.props.preferencesData.excludedRandomLibraries, this.context.libraries);
    const platformOptions = this.itemizePlatformOptionsMemo(this.props.platforms, this.props.preferencesData.nativePlatforms);
    const appPathOverrides = this.renderAppPathOverridesMemo(this.props.preferencesData.appPathOverrides);
    const tagFilters = this.renderTagFiltersMemo(this.props.preferencesData.tagFilters, this.props.preferencesData.browsePageShowExtreme, this.context, this.props.logoVersion);
    const logoSetPreviewRows = this.renderLogoSetMemo(this.props.platforms, this.props.logoVersion);
    const extensions = this.renderExtensionsMemo(this.props.extensions, strings);
    const extConfigSections = this.renderExtensionConfigs(this.props.extConfigs, this.props.extConfig);
    return (
      <div className='config-page simple-scroll'>
        <div className='config-page__inner'>
          <h1 className='config-page__title'>{strings.configHeader}</h1>
          <p className='config-page__description'>{strings.configDesc}</p>

          {/* -- Preferences -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.preferencesHeader}</p>
            <div className='setting__body'>
              {/* Enable Editing */}
              <ConfigBoxCheckbox
                title={strings.enableEditing}
                description={strings.enableEditingDesc}
                checked={this.props.preferencesData.enableEditing}
                onToggle={this.onEnableEditingChange} />
              {/** Symlink Curation Content */}
              { this.props.preferencesData.enableEditing && (
                <ConfigBoxCheckbox
                  title={strings.symlinkCuration}
                  description={strings.symlinkCurationDesc}
                  checked={this.props.preferencesData.symlinkCurationContent}
                  onToggle={this.onSymlinkCurationContentChange}/>
              )}
              {/* On Demand Images */}
              <ConfigBox
                title={strings.onDemandImages}
                description={strings.onDemandImagesDesc}
                swapChildren={true} >
                <ConfigBoxInnerCheckbox
                  title={strings.onDemandImagesEnabled}
                  description={strings.onDemandImagesEnabledDesc}
                  checked={this.props.preferencesData.onDemandImages}
                  onToggle={this.onOnDemandImagesChange} />
                <ConfigBoxInnerCheckbox
                  title={strings.onDemandImagesCompressed}
                  description={strings.onDemandImagesCompressedDesc}
                  checked={this.props.preferencesData.onDemandImagesCompressed}
                  onToggle={this.onDemandImagesCompressedChange} />
                <ConfigBoxInnerButton
                  title={strings.onDemandImagesDelete}
                  description={strings.onDemandImagesDeleteDesc}
                  value={allStrings.curate.delete}
                  onClick={this.onDeleteImages} />
              </ConfigBox>
              {/* Playtime Tracking */}
              <ConfigBox
                title={strings.playtimeTracking}
                description={strings.playtimeTrackingDesc}
                swapChildren={true}>
                <ConfigBoxInnerCheckbox
                  title={strings.enablePlaytimeTracking}
                  description={strings.enablePlaytimeTrackingDesc}
                  checked={this.props.preferencesData.enablePlaytimeTracking}
                  onToggle={this.onToggleEnablePlaytimeTracking} />
                <ConfigBoxInnerCheckbox
                  title={strings.enablePlaytimeTrackingExtreme}
                  description={strings.enablePlaytimeTrackingExtremeDesc}
                  checked={this.props.preferencesData.enablePlaytimeTrackingExtreme}
                  onToggle={this.onToggleEnablePlaytimeTrackingExtreme} />
                <ConfigBoxInner
                  title={strings.clearPlaytimeTracking}
                  description={strings.clearPlaytimeTrackingDesc}>
                  <ConfirmElement
                    render={this.renderClearPlaytimeButton}
                    onConfirm={this.onClearPlaytimeTracking}
                    message={allStrings.dialog.confirmClearPlaytime}
                    extra={[strings]}/>
                </ConfigBoxInner>
              </ConfigBox>
              {/* Fancy Animations */}
              <ConfigBoxCheckbox
                title={strings.fancyAnimations}
                description={strings.fancyAnimationsDesc}
                checked={this.props.preferencesData.fancyAnimations}
                onToggle={this.onFancyAnimationsChange} />
              {/* Short Search */}
              <ConfigBoxSelect
                title={strings.searchLimit}
                description={strings.searchLimitDesc}
                value={this.props.preferencesData.searchLimit.toString()}
                onChange={this.onSearchLimitChange}
                items={searchLimitOptions}/>
              {/* Current Language */}
              <ConfigBoxSelect
                title={strings.currentLanguage}
                description={strings.currentLanguageDesc}
                value={this.props.preferencesData.currentLanguage || ''}
                onChange={this.onCurrentLanguageSelect}
                items={langOptions} />
              {/* Screenshot Preview Mode */}
              <ConfigBoxSelect
                title={strings.screenshotPreviewMode}
                description={strings.screenshotPreviewModeDesc}
                value={this.props.preferencesData.screenshotPreviewMode}
                items={this.itemizeScreenshotPreviewModes(strings)}
                onChange={this.onScreenshotPreviewModeChange}
              />
              <ConfigBoxSelectInput
                title={strings.screenshotPreviewDelay}
                description={strings.screenshotPreviewDelayDesc}
                editable={true}
                text={this.props.preferencesData.screenshotPreviewDelay.toString()}
                placeholder='250'
                onChange={this.onScreenshotPreviewDelayChange}
                onItemSelect={this.onScreenshotPreviewDelayChange}
                items={['0', '150', '250', '350', '500', '750', '1000']}/>
            </div>
          </div>
          {/* -- Content Filters -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.contentFiltersHeader}</p>
            <div className='setting__body'>
              {/* Show Extreme Games */}
              {((!this.props.preferencesData.disableExtremeGames)) ? (
                <ConfigBoxCheckbox
                  title={strings.extremeGames}
                  description={strings.extremeGamesDesc}
                  checked={this.props.preferencesData.browsePageShowExtreme}
                  onToggle={this.onShowExtremeChange} />
              ) : undefined }
              {this.props.preferencesData.browsePageShowExtreme && (
                <ConfigBoxCheckbox
                  title={strings.hideExtremeScreenshots}
                  description={strings.hideExtremeScreenshotsDesc}
                  checked={this.props.preferencesData.hideExtremeScreenshots}
                  onToggle={this.onToggleHideExtremeScreenshots} />
              )}
              {/* Tag Filter Groups */}
              <ConfigBox
                title={strings.tagFilterGroups}
                description={strings.tagFilterGroupsDesc}
                swapChildren={true}>
                {tagFilters}
                <div
                  onClick={this.onNewTagFilterGroup}
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
                onChange={this.onExcludedLibraryCheckboxChange}
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
                  input={this.state.flashpointPath}
                  buttonText={strings.browse}
                  onInputChange={this.onFlashpointPathChange}
                  isValid={this.state.isFlashpointPathValid} />
              </ConfigBox>
              {/* Native Platforms */}
              <ConfigBoxMultiSelect
                title={strings.nativePlatforms}
                description={strings.nativePlatformsDesc}
                text={strings.platforms}
                onChange={this.onNativeCheckboxChange}
                items={platformOptions} />
              {/* App Path Overrides */}
              <ConfigBox
                title={strings.appPathOverrides}
                description={strings.appPathOverridesDesc}
                swapChildren={true} >
                {appPathOverrides}
                <div
                  onClick={this.onNewAppPathOverride}
                  className='setting__row__content--override-row__new'>
                  <OpenIcon
                    icon='plus' />
                </div>
              </ConfigBox>
              {/* Verbose Logging */}
              <ConfigBoxCheckbox
                title={strings.enableVerboseLogging}
                description={strings.enableVerboseLoggingDesc}
                checked={this.props.preferencesData.enableVerboseLogging}
                onToggle={this.onVerboseLoggingToggle} />
            </div>
          </div>

          {/* -- Visuals -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.visualsHeader}</p>
            <div className='setting__body'>
              <ConfigBoxCheckbox
                title={strings.useCustomTitleBar}
                description={strings.useCustomTitleBarDesc}
                checked={this.state.useCustomTitlebar}
                onToggle={this.onUseCustomTitlebarChange}/>
              {/* Theme */}
              <ConfigBoxSelectInput
                title={strings.theme}
                description={strings.themeDesc}
                text={this.getThemeName(this.props.preferencesData.currentTheme || '') || ''}
                placeholder={strings.noTheme}
                editable={true}
                items={[ ...this.props.themeList.map(formatThemeItemName), 'No Theme' ]}
                onChange={this.onCurrentThemeChange}
                onItemSelect={this.onCurrentThemeItemSelect}/>
              {/* Logo Set */}
              <ConfigBoxSelectInput
                title={strings.logoSet}
                description={strings.logoSetDesc}
                text={this.getLogoSetName(this.props.preferencesData.currentLogoSet || '') || ''}
                placeholder={strings.noLogoSet}
                editable={true}
                items={[ ...this.props.logoSets.map(formatLogoSetName), 'No Logo Set' ]}
                onChange={this.onCurrentLogoSetChange}
                onItemSelect={this.onCurrentLogoSetSelect}
                bottomChildren={logoSetPreviewRows}/>
            </div>
          </div>

          {/* -- Advanced -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.advancedHeader}</p>
            <div className='setting__body'>
              {/* Optimize Database */}
              <ConfigBoxButton
                title={strings.optimizeDatabase}
                description={strings.optimizeDatabaseDesc}
                value={allStrings.curate.run}
                onClick={this.onOptimizeDatabase}/>
              {/* Show Developer Tab */}
              <ConfigBoxCheckbox
                title={strings.showDeveloperTab}
                description={strings.showDeveloperTabDesc}
                checked={this.props.preferencesData.showDeveloperTab}
                onToggle={this.onShowDeveloperTab} />
              {/* Register As Protocol Handler */}
              <ConfigBoxCheckbox
                title={strings.registerProtocol}
                description={strings.registerProtocolDesc}
                checked={this.props.preferencesData.registerProtocol}
                onToggle={this.onRegisterProtocol} />
              {/* Server */}
              <ConfigBoxSelect
                title={strings.server}
                description={strings.serverDesc}
                value={this.props.preferencesData.server}
                onChange={this.onServerSelect}
                items={serverOptions} />
              {this.props.preferencesData.enableEditing && (
                <ConfigBoxSelect
                  title={strings.curateServer}
                  description={strings.curateServerDesc}
                  value={this.props.preferencesData.curateServer}
                  onChange={this.onCurateServerSelect}
                  items={serverOptions} />
              )}
              {/* Fallback Language */}
              <ConfigBoxSelect
                title={strings.fallbackLanguage}
                description={strings.fallbackLanguageDesc}
                value={this.props.preferencesData.fallbackLanguage || ''}
                onChange={this.onFallbackLanguageSelect}
                items={langOptions} />
            </div>
          </div>

          {/* -- Advanced -- */}

          {extConfigSections}

          <div className='setting'>
            <p className='setting__title'>{strings.extensionsHeader}</p>
            { extensions.length > 0 ? (
              <div className='setting__body'>
                {extensions}
              </div>
            ) : <div>{formatString(strings.noExtensionsLoaded, this.props.preferencesData.extensionsPath)}</div>}
          </div>

          {/* -- Save & Restart -- */}
          <div className='setting'>
            <div className='setting__row'>
              <input
                type='button'
                value={strings.saveAndRestart}
                className='simple-button save-and-restart'
                onClick={this.onSaveAndRestartClick} />
            </div>
          </div>
        </div>
        { this.state.editorOpen && this.state.editingTagFilterGroup && (
          <FloatingContainer>
            <TagFilterGroupEditor
              tagFilterGroup={this.state.editingTagFilterGroup}
              onAddTag={(tag) => this.onAddTagEditorTagEvent(this.state.editingTagFilterGroupIdx || -1, tag)}
              onAddCategory={(category) => this.onAddTagEditorCategoryEvent(this.state.editingTagFilterGroupIdx || -1, category)}
              onRemoveTag={(tag) => this.onRemoveTagEditorTagEvent(this.state.editingTagFilterGroupIdx || -1, tag)}
              onRemoveCategory={(category) => this.onRemoveTagEditorCategoryEvent(this.state.editingTagFilterGroupIdx || -1, category)}
              onChangeName={this.onChangeTagEditorNameEvent}
              onChangeDescription={this.onChangeTagEditorDescriptionEvent}
              onChangeIconBase64={this.onChangeTagEditorIconEvent}
              onToggleExtreme={this.onToggleExtremeTagEditorEvent}
              closeEditor={this.onCloseTagFilterGroupEditor}
              showExtreme={this.props.preferencesData.browsePageShowExtreme}
              tagCategories={this.props.tagCategories}
              activeTagFilterGroups={this.props.preferencesData.tagFilters.filter((tfg, index) => (tfg.enabled || (tfg.extreme && !this.props.preferencesData.browsePageShowExtreme)) && index != this.state.editingTagFilterGroupIdx)} />
          </FloatingContainer>
        )}
        { this.state.nukeInProgress && (
          <FloatingContainer>
            <div className='tag-nuke-box'>
              <div>{strings.nukeInProgress}</div>
              <Spinner/>
            </div>
          </FloatingContainer>
        )}
      </div>
    );
  }

  itemizeLangOptionsMemo = memoizeOne((langs: LangFile[], autoString: string): SelectItem<string>[] => {
    const items: SelectItem<string>[] = langs.map((lang) => {
      return {
        value: lang.code,
        display: lang.data.name ? `${lang.data.name} (${lang.code})` : lang.code
      };
    });
    items.push({ value: '<none>', display: 'None'});
    items.push({ value: autoCode, display: autoString});
    return items;
  });

  itemizeServerOptionsMemo = memoizeOne((serverNames: string[]): SelectItem<string>[] =>
    serverNames.map((name) => {
      return {
        value: name
      };
    })
  );

  itemizeSearchLimitOptionsMemo = memoizeOne( (strings: LangContainer['config']): SelectItem<string>[] => {
    return [
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
  });

  itemizeScreenshotPreviewModes = memoizeOne( (strings: LangContainer['config']): SelectItem<number>[] => {
    return [
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
  });

  itemizeLibraryOptionsMemo = memoizeOne((libraries: string[], excludedRandomLibraries: string[], libraryStrings: LangContainer['libraries']): MultiSelectItem[] => {
    return libraries.map(library => {
      return {
        value: library,
        display: libraryStrings[library] || library,
        checked: !excludedRandomLibraries.includes(library)
      };
    });
  });

  itemizePlatformOptionsMemo = memoizeOne((platforms: string[], nativePlatforms: string[]) => {
    return platforms.map(platform => {
      return {
        value: platform,
        checked: nativePlatforms.includes(platform)
      };
    });
  });

  renderClearPlaytimeButton = ({ confirm, extra }: ConfirmElementArgs<[LangContainer['config']]>) => {
    return (
      <SimpleButton
        className='setting__row__button'
        value={extra[0].clearData}
        onClick={confirm}/>
    );
  };

  renderDeleteSource = ({ confirm }: ConfirmElementArgs) => {
    return (
      <div
        onClick={confirm}
        className='setting__row__content--remove-app-override'>
        <OpenIcon
          className='setting__row__content--override-row__delete'
          icon='delete' />
      </div>
    );
  };

  renderAppPathOverridesMemo = memoizeOne((appPathOverrides: AppPathOverride[]) => {
    return appPathOverrides.map((item, index) => {
      return (
        <div
          className='setting__row__content--override-row'
          key={index}>
          <CheckBox
            checked={item.enabled}
            onToggle={(checked) => this.onAppPathOverrideEnabledToggle(index, checked)}/>
          <InputField
            editable={true}
            onChange={(event) => this.onAppPathOverridePathChange(index, event.target.value)}
            text={item.path} />
          <div
            className='setting__row__content--override-row__seperator'>
            {'->'}
          </div>
          <InputField
            editable={true}
            onChange={(event) => this.onAppPathOverrideOverrideChange(index, event.target.value)}
            text={item.override} />
          <div
            onClick={() => this.onRemoveAppPathOverride(index)}
            className='setting__row__content--remove-app-override'>
            <OpenIcon
              className='setting__row__content--override-row__delete'
              icon='delete' />
          </div>
        </div>
      );
    });
  });

  renderTagFiltersMemo = memoizeOne((tagFilters: TagFilterGroup[], showExtreme: boolean, strings: LangContainer, logoVersion: number) => {
    return tagFilters.map((item, index) => {
      if (showExtreme ? true : !item.extreme) {
        return (
          <div
            className='setting__row__content--override-row'
            key={index}>
            { showExtreme &&
              (item.extreme ? (
                <div
                  key={index}
                  className='config-page__tfg-extreme-logo'
                  title={strings.browse.extreme}
                  style={{ backgroundImage: `url('${getExtremeIconURL(logoVersion)}')` }} />
              ) : (item.iconBase64 ? (
                <div
                  key={index}
                  className='config-page__tfg-extreme-logo'
                  title={strings.browse.tagFilterIcon}
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
              onClick={() => this.onTagFilterGroupEnabledToggle(index, !item.enabled)}>
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
              onClick={() => this.onEditTagFilterGroup(index)}
              title={strings.config.editTagFilter}
              className='browse-right-sidebar__title-row__buttons__edit-button'>
              <OpenIcon
                className='setting__row__content--override-row__edit'
                icon='pencil' />
            </div>
            <div
              onClick={() => this.onDuplicateTagFilterGroup(index)}
              title={strings.config.duplicateTagFilter}
              className='browse-right-sidebar__title-row__buttons__edit-button'>
              <OpenIcon
                className='setting__row__content--override-row__edit'
                icon='layers' />
            </div>
            <ConfirmElement
              message={strings.dialog.nukeTagFilterGroup}
              onConfirm={() => this.onTagFilterGroupNuke(index)}
              render={this.renderTagFilterGroupNuke} />
            <ConfirmElement
              message={strings.dialog.deleteTagFilterGroup}
              onConfirm={() => this.onTagFilterGroupDelete(index)}
              render={this.renderTagFilterGroupDelete} />
          </div>
        );
      }
    });
  });

  renderLogoSetMemo = memoizeOne((platforms: string[], logoVersion: number) => {
    const allRows: JSX.Element[] = [];
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
  });

  renderExtensionsMemo = memoizeOne((extensions: IExtensionDescription[], strings: LangContainer['config']): JSX.Element[] => {
    return extensions.map((ext) => {
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
        <div key={ext.id}>
          <div className='setting__row'>
            <div className='setting__row__top'>
              <div className='setting__row__title setting__row__title--flex setting__row__title--align-left'>
                { ext.icon ? (
                  <div
                    style={{ backgroundImage: `url(${getExtIconURL(ext.id)})`}}
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
            <div className='setting__row__bottom'>
              <p>{ext.description}</p>
            </div>
          </div>
        </div>
      );
    });
  });

  renderExtensionConfigs = memoizeOne((extConfigs: ExtensionContribution<'configuration'>[], extConfig: AppExtConfigData) => {
    let sections: JSX.Element[] = [];

    extConfigs.forEach((contrib, idx) => {
      sections = sections.concat(contrib.value.map((config, configIdx) => {
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
      }).filter(p => !!p) as JSX.Element[]);
    });

    return sections;
  });

  renderTagFilterGroupNuke = ({ confirm }: ConfirmElementArgs) => {
    const strings = this.context.config;
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

  renderTagFilterGroupDelete = ({ confirm }: ConfirmElementArgs) => {
    const strings = this.context.config;
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

  onShowExtremeChange = (isChecked: boolean): void => {
    updatePreferencesData({ browsePageShowExtreme: isChecked });
  };

  onToggleHideExtremeScreenshots = (isChecked: boolean): void => {
    updatePreferencesData({ hideExtremeScreenshots: isChecked });
  };

  onToggleEnablePlaytimeTracking = (isChecked: boolean): void => {
    updatePreferencesData({ enablePlaytimeTracking: isChecked });
  };

  onToggleEnablePlaytimeTrackingExtreme = (isChecked: boolean): void => {
    updatePreferencesData({ enablePlaytimeTrackingExtreme: isChecked });
  };

  onClearPlaytimeTracking = (): void => {
    window.Shared.back.request(BackIn.CLEAR_PLAYTIME_TRACKING);
  };

  onEnableEditingChange = (isChecked: boolean): void => {
    updatePreferencesData({ enableEditing: isChecked });
  };

  onSymlinkCurationContentChange = (isChecked: boolean): void => {
    updatePreferencesData({ symlinkCurationContent: isChecked });
  };

  onOnDemandImagesChange = (isChecked: boolean): void => {
    updatePreferencesData({ onDemandImages: isChecked });
  };

  onDemandImagesCompressedChange = (isChecked: boolean): void => {
    updatePreferencesData({ onDemandImagesCompressed: isChecked });
  };

  onFancyAnimationsChange = (isChecked: boolean): void => {
    updatePreferencesData({ fancyAnimations: isChecked });
  };

  onVerboseLoggingToggle = (isChecked: boolean): void => {
    updatePreferencesData({ enableVerboseLogging: isChecked });
  };

  onSearchLimitChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ searchLimit: num(event.target.value) });
  };

  onCurrentLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ currentLanguage: event.target.value });
  };

  onServerSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ server: event.target.value });
  };

  onCurateServerSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ curateServer: event.target.value });
  };

  onFallbackLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ fallbackLanguage: event.target.value });
  };

  onExcludedLibraryCheckboxChange = (library: string): void => {
    const excludedRandomLibraries = [ ...this.props.preferencesData.excludedRandomLibraries ];

    const index = excludedRandomLibraries.findIndex(item => item === library);
    if (index !== -1) {
      excludedRandomLibraries.splice(index, 1);
    } else {
      excludedRandomLibraries.push(library);
    }

    updatePreferencesData({ excludedRandomLibraries });
  };

  onRemoveAppPathOverride = (index: number): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths.splice(index, 1);
    console.log('SPLICED');
    updatePreferencesData({ appPathOverrides: newPaths });
  };

  onNewAppPathOverride = (): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths.push({path: '', override: '', enabled: true});
    updatePreferencesData({ appPathOverrides: newPaths });
  };

  onAppPathOverridePathChange = (index: number, newPath: string): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths[index] = { ...newPaths[index], path: newPath };
    updatePreferencesData({ appPathOverrides: newPaths });
  };

  onAppPathOverrideOverrideChange = (index: number, newOverride: string): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths[index] = { ...newPaths[index], override: newOverride };
    updatePreferencesData({ appPathOverrides: newPaths });
  };

  onAppPathOverrideEnabledToggle = (index: number, checked: boolean): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths[index] = { ...newPaths[index], enabled: checked };
    updatePreferencesData({ appPathOverrides: newPaths });
  };

  onNewTagFilterGroup = (): void => {
    const tfg: TagFilterGroup = {
      name: 'New Group',
      description: '',
      enabled: true,
      tags: [],
      categories: [],
      childFilters: [],
      extreme: false,
      iconBase64: ''
    };
    const newTagFilters = [...this.props.preferencesData.tagFilters];
    newTagFilters.push(tfg);
    updatePreferencesData({ tagFilters: newTagFilters });
  };

  onTagFilterGroupEnabledToggle = (index: number, checked: boolean): void => {
    const newTagFilters = [...this.props.preferencesData.tagFilters];
    newTagFilters[index] = { ...newTagFilters[index], enabled: checked };
    updatePreferencesData({ tagFilters: newTagFilters });
  };

  onAddTagEditorTagEvent = (index: number, tag: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = deepCopy(this.state.editingTagFilterGroup);
      newTFG.tags.push(tag);
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onAddTagEditorCategoryEvent = (index: number, category: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = deepCopy(this.state.editingTagFilterGroup);
      newTFG.categories.push(category);
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onRemoveTagEditorTagEvent = (index: number, tag: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = deepCopy(this.state.editingTagFilterGroup);
      const idx = newTFG.tags.findIndex(t => t === tag);
      if (idx > -1) {
        newTFG.tags.splice(idx, 1);
      }
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onRemoveTagEditorCategoryEvent = (index: number, category: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = deepCopy(this.state.editingTagFilterGroup);
      const idx = newTFG.categories.findIndex(c => c === category);
      if (idx > -1) {
        newTFG.categories.splice(idx, 1);
      }
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onChangeTagEditorNameEvent = (name: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = {...this.state.editingTagFilterGroup, name };
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onChangeTagEditorDescriptionEvent = (description: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = {...this.state.editingTagFilterGroup, description };
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onToggleExtremeTagEditorEvent = (checked: boolean): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = {...this.state.editingTagFilterGroup, extreme: checked };
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onChangeTagEditorIconEvent = (iconBase64: string): void => {
    if (this.state.editingTagFilterGroup) {
      const newTFG = {...this.state.editingTagFilterGroup, iconBase64 };
      this.setState({ editingTagFilterGroup: newTFG });
    }
  };

  onDuplicateTagFilterGroup = (index: number): void => {
    const newTagFilters = [...this.props.preferencesData.tagFilters];
    newTagFilters.push({...newTagFilters[index], name: `${newTagFilters[index].name} - Copy`});
    updatePreferencesData({ tagFilters: newTagFilters });
  };

  onEditTagFilterGroup = (index: number): void => {
    const tagFilter = this.props.preferencesData.tagFilters[index];
    this.setState({ editingTagFilterGroup: tagFilter, editingTagFilterGroupIdx: index, editorOpen: true });
  };

  onNativeCheckboxChange = (platform: string): void => {
    const newPlatforms = [...this.props.preferencesData.nativePlatforms];
    const index = newPlatforms.findIndex(item => item === platform);

    if (index !== -1) {
      log.info('launcher', `WE CHANGED ${platform} TO false`);
      newPlatforms.splice(index, 1);
    } else {
      log.info('launcher', `WE CHANGED ${platform} TO true`);
      newPlatforms.push(platform);
    }

    updatePreferencesData({ nativePlatforms: newPlatforms });
  };

  /**
   * When the "Flashpoint Data Folder Path" input text is changed.
   *
   * @param filePath Changed file path
   */
  onFlashpointPathChange = async (filePath: string): Promise<void> => {
    this.setState({ flashpointPath: filePath });
    // Check if the file-path points at a valid FlashPoint folder
    const isValid = await isFlashpointValidCheck(filePath);
    this.setState({ isFlashpointPathValid: isValid });
  };

  onUseCustomTitlebarChange = (isChecked: boolean): void => {
    this.setState({ useCustomTitlebar: isChecked });
  };

  onShowDeveloperTab = (isChecked: boolean): void => {
    updatePreferencesData({ showDeveloperTab: isChecked });
  };

  onRegisterProtocol = (isChecked: boolean): void => {
    updatePreferencesData({ registerProtocol: isChecked });
    ipcRenderer.invoke(CustomIPC.REGISTER_PROTOCOL, isChecked)
    .then((success) => {
      if (!success) {
        const regVerb = isChecked ? 'add' : 'remove';
        alert('Failed to ' + regVerb + ' protocol registration');
      }
    });
  };

  onCurrentThemeChange = (value: string): void => {
    const selectedTheme = this.props.themeList.find(t => t.id === value);
    if (selectedTheme) {
      const suggestedLogoSet = this.props.logoSets.find(ls => ls.id === selectedTheme.logoSet);
      const logoSetId = suggestedLogoSet ? suggestedLogoSet.id : this.props.preferencesData.currentLogoSet;
      updatePreferencesData({ currentTheme: selectedTheme.id, currentLogoSet: logoSetId });
    }
  };

  onCurrentLogoSetChange = (value: string): void => {
    updatePreferencesDataAsync({ currentLogoSet: value });
  };

  onCurrentThemeItemSelect = (value: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered themes.
    //       Directly after that comes the "No Theme" suggestion.
    let theme: ITheme | undefined;
    if (index < this.props.themeList.length) { // (Select a Theme)
      theme = this.props.themeList[index];
    } else { theme = undefined; } // (Deselect the current theme)
    const suggestedLogoSet = this.props.logoSets.find(ls => ls.id === (theme ? theme.logoSet : undefined));
    const logoSetId = suggestedLogoSet ? suggestedLogoSet.id : this.props.preferencesData.currentLogoSet;
    updatePreferencesData({ currentTheme: theme ? theme.id : '', currentLogoSet: logoSetId });
  };

  onCurrentLogoSetSelect = (value: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered logo sets.
    //       Directly after that comes the "No Theme" suggestion.
    let logoSet: ILogoSet | undefined;
    if (index < this.props.logoSets.length) { // (Select a Logo Set)
      logoSet = this.props.logoSets[index];
    } else { logoSet = undefined; } // (Deselect the current logo set)
    updatePreferencesDataAsync({ currentLogoSet: logoSet ? logoSet.id : undefined });
  };

  onScreenshotPreviewModeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ screenshotPreviewMode: num(event.target.value) });
  };

  onScreenshotPreviewDelayChange = (value: string): void => {
    updatePreferencesData({ screenshotPreviewDelay: num(value) });
  };

  getThemeName(id: string) {
    const theme = this.props.themeList.find(t => t.id === id);
    if (theme) { return theme.meta.name || theme.id; }
  }

  getLogoSetName(id: string) {
    const logoSet = this.props.logoSets.find(ls => ls.id === id);
    if (logoSet) { return logoSet.name; }
  }

  onCloseTagFilterGroupEditor = () => {
    if (this.state.editingTagFilterGroup && this.state.editingTagFilterGroupIdx != undefined) {
      const newTagFilters = [...this.props.preferencesData.tagFilters];
      newTagFilters[this.state.editingTagFilterGroupIdx] = this.state.editingTagFilterGroup;
      updatePreferencesData({ tagFilters: newTagFilters });
      this.setState({ editingTagFilterGroup: undefined, editingTagFilterGroupIdx: undefined, editorOpen: false });
    }
  };

  onTagFilterGroupNuke = async (index: number) => {
    // Nuke all the tags
    this.setState({ nukeInProgress: true });
    window.Shared.back.request(BackIn.NUKE_TAGS, this.props.preferencesData.tagFilters[index].tags)
    .then(() => {
      const newTagFilters = [...this.props.preferencesData.tagFilters];
      newTagFilters.splice(index, 1);
      updatePreferencesData({ tagFilters: newTagFilters });
    })
    .catch((error) => {
      alert('Failed to nuke tags: ' + error);
    })
    .finally(() => {
      this.setState({ nukeInProgress: false });
    });
  };

  onTagFilterGroupDelete = async (index: number) => {
    const newTagFilters = [...this.props.preferencesData.tagFilters];
    newTagFilters.splice(index, 1);
    updatePreferencesData({ tagFilters: newTagFilters });
  };

  /** When the "Save & Restart" button is clicked. */
  onSaveAndRestartClick = () => {
    // Save new config to file, then restart the app
    window.Shared.back.request(BackIn.UPDATE_CONFIG, {
      flashpointPath: this.state.flashpointPath,
      useCustomTitlebar: this.state.useCustomTitlebar,
    }).then(() => { window.Shared.restart(); });
  };

  onDeleteImages = () => {
    window.Shared.back.request(BackIn.DELETE_ALL_IMAGES)
    .catch((err) => {
      alert('Error: ' + err);
    });
  };

  onOptimizeDatabase = () => {
    window.Shared.back.request(BackIn.OPTIMIZE_DATABASE)
    .catch((err) => {
      alert('Error: ' + err);
    });
  };

}

function setExtConfigValue(key: string, value: any): void {
  return window.Shared.back.send(BackIn.SET_EXT_CONFIG_VALUE, key, value);
}

function renderExtConfigProp(key: string, prop: ExtConfigurationProp, value: any): JSX.Element | undefined {
  switch (prop.type) {
    case 'button': {
      return (
        <ConfigBoxButton
          key={key}
          title={prop.title}
          description={prop.description}
          value='Run'
          onClick={() => window.Shared.back.request(BackIn.RUN_COMMAND, prop.command || '')}/>
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
