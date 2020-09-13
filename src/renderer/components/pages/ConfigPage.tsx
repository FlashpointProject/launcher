import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { BackIn, UpdateConfigData } from '@shared/back/types';
import { IExtensionDescription, ILogoSet } from '@shared/extensions/interfaces';
import { autoCode, LangContainer, LangFile } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { ITheme } from '@shared/ThemeFile';
import { formatString } from '@shared/utils/StringFormatter';
import { AppPathOverride } from 'flashpoint-launcher';
import * as React from 'react';
import { getExtIconURL, getPlatformIconURL, isFlashpointValidCheck } from '../../Util';
import { LangContext } from '../../util/lang';
import { ConfigBox } from '../ConfigBox';
import { ConfigBoxCheckbox } from '../ConfigBoxCheckbox';
import { ConfigBoxInput } from '../ConfigBoxInput';
import { ConfigBoxMultiSelect, MultiSelectItem } from '../ConfigBoxMultiselect';
import { ConfigBoxSelect, SelectItem } from '../ConfigBoxSelect';
import { ConfigBoxSelectInput } from '../ConfigBoxSelectInput';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { InputField } from '../InputField';
import { OpenIcon } from '../OpenIcon';

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
  localeCode: string;
};

export type ConfigPageProps = OwnProps & WithPreferencesProps;

type ConfigPageState = {
  /** If the currently entered Flashpoint path points to a "valid" Flashpoint folder (it exists and "looks" like a Flashpoint folder). */
  isFlashpointPathValid?: boolean;
  /** Currently entered Flashpoint path. */
  flashpointPath: string;
  /** Currently entered Metadata Server Host */
  metadataServerHost: string;
  /** If the "use custom title bar" checkbox is checked. */
  useCustomTitlebar: boolean;
  /** Array of native platforms */
  nativePlatforms: string[];
  /** Current Server */
  server: string;
};

export interface ConfigPage {
  context: LangContainer;
}

/**
 * A page displaying some of the current "configs" / "preferences", as well as a way of changing them.
 * All changed "configs" (settings stored in "config.json") require you to "Save & Restart" to take effect.
 * The changed "preferences" (settings stored in "preferences.json") do not require a restart, and are updated directly.
 * @TODO Make it clear which settings are "configs" and which are "preferences" (or at least which require you to "save & restart")?
 */
export class ConfigPage extends React.Component<ConfigPageProps, ConfigPageState> {

  constructor(props: ConfigPageProps) {
    super(props);
    const configData = window.Shared.config.data;
    this.state = {
      isFlashpointPathValid: undefined,
      flashpointPath: configData.flashpointPath,
      metadataServerHost: configData.metadataServerHost,
      useCustomTitlebar: configData.useCustomTitlebar,
      nativePlatforms: configData.nativePlatforms,
      server: configData.server
    };
  }

  render() {
    const strings = this.context.config;
    const autoString = formatString(strings.auto, this.props.localeCode);
    const langOptions = this.itemizeLangOptionsMemo(this.props.availableLangs, autoString);
    const serverOptions = this.itemizeServerOptionsMemo(this.props.serverNames);
    const libraryOptions = this.itemizeLibraryOptionsMemo(this.props.libraries, this.props.preferencesData.excludedRandomLibraries, this.context.libraries);
    const platformOptions = this.itemizePlatformOptionsMemo(this.props.platforms, this.state.nativePlatforms);
    const appPathOverrides = this.renderAppPathOverridesMemo(this.props.preferencesData.appPathOverrides);
    const logoSetPreviewRows = this.renderLogoSetMemo(this.props.platforms, this.props.logoVersion);
    const extensions = this.renderExtensionsMemo(this.props.extensions, strings);
    return (
      <div className='config-page simple-scroll'>
        <div className='config-page__inner'>
          <h1 className='config-page__title'>{strings.configHeader}</h1>
          <p className='config-page__description'>{strings.configDesc}</p>

          {/* -- Preferences -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.preferencesHeader}</p>
            <div className='setting__body'>
              {/* Show Extreme Games */}
              {((!window.Shared.config.data.disableExtremeGames)) ? (
                <ConfigBoxCheckbox
                  title={strings.extremeGames}
                  description={strings.extremeGamesDesc}
                  checked={this.props.preferencesData.browsePageShowExtreme}
                  onToggle={this.onShowExtremeChange} />
              ) : undefined }
              {/* Enable Editing */}
              <ConfigBoxCheckbox
                title={strings.enableEditing}
                description={strings.enableEditingDesc}
                checked={this.props.preferencesData.enableEditing}
                onToggle={this.onEnableEditingChange} />
              {/* On Demand Images */}
              <ConfigBoxCheckbox
                title={strings.onDemandImages}
                description={strings.onDemandImagesDesc}
                checked={this.props.preferencesData.onDemandImages}
                onToggle={this.onOnDemandImagesChange} />
              {/* Current Language */}
              <ConfigBoxSelect
                title={strings.currentLanguage}
                description={strings.currentLanguageDesc}
                value={this.props.preferencesData.currentLanguage || ''}
                onChange={this.onCurrentLanguageSelect}
                items={langOptions} />
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
              {/* Random Libraries */}
              <ConfigBoxMultiSelect
                title={strings.randomLibraries}
                description={strings.randomLibrariesDesc}
                text={strings.libraries}
                onChange={this.onExcludedLibraryCheckboxChange}
                items={libraryOptions} />
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
                description={strings.appPathOverridesDesc} >
                {appPathOverrides}
                <div
                  onClick={this.onNewAppPathOverride}
                  className='setting__row__content--override-row__new'>
                  <OpenIcon
                    icon='plus' />
                </div>
              </ConfigBox>
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
              {/* Show Developer Tab */}
              <ConfigBoxCheckbox
                title={strings.showDeveloperTab}
                description={strings.showDeveloperTabDesc}
                checked={this.props.preferencesData.showDeveloperTab}
                onToggle={this.onShowDeveloperTab} />
              {/* Server */}
              <ConfigBoxSelect
                title={strings.server}
                description={strings.serverDesc}
                value={this.state.server}
                onChange={this.onServerSelect}
                items={serverOptions} />
              {/* Metadata Server Host */}
              <ConfigBoxInput
                title={strings.metadataServerHost}
                description={strings.metadataServerHostDesc}
                contentClassName='setting__row__content--filepath-path'
                editable={true}
                text={this.state.metadataServerHost}
                onChange={this.onMetadataServerHostChange} />
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
          <div className='setting'>
            <p className='setting__title'>{strings.extensionsHeader}</p>
            { extensions.length > 0 ? (
              <div className='setting__body'>
                {extensions}
              </div>
            ) : <div>{formatString(strings.noExtensionsLoaded, window.Shared.config.data.extensionsPath)}</div>}
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
      </div>
    );
  }

  itemizeLangOptionsMemo = memoizeOne((langs: LangFile[], autoString: string): SelectItem[] => {
    const items: SelectItem[] = langs.map((lang) => {
      return {
        value: lang.code,
        display: lang.data.name ? `${lang.data.name} (${lang.code})` : lang.code
      };
    });
    items.push({ value: '<none>', display: 'None'});
    items.push({ value: autoCode, display: autoString});
    return items;
  });

  itemizeServerOptionsMemo = memoizeOne((serverNames: string[]): SelectItem[] =>
    serverNames.map((name) => {
      return {
        value: name
      };
    })
  );

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

  renderAppPathOverridesMemo = memoizeOne((appPathOverrides: AppPathOverride[]) => {
    return appPathOverrides.map((item, index) => {
      return (
        <div
          className='setting__row__content--override-row'
          key={index}>
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

  renderLogoSetMemo = memoizeOne((platforms: string[], logoVersion: number) => {
    const allRows: JSX.Element[] = [];
    // Render 16 logos per row, vertically stacked
    for (let i = 0; i < platforms.length; i = i + 16) {
      const slice = platforms.slice(i, i+16);
      allRows.push(
        <div
          className='config-page__logo-row'
          key={i} >
          { slice.map((platform, index) =>
            <div
              key={index}
              className='config-page__logo-row__logo'
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

  onShowExtremeChange = (isChecked: boolean): void => {
    updatePreferencesData({ browsePageShowExtreme: isChecked });
  }

  onEnableEditingChange = (isChecked: boolean): void => {
    updatePreferencesData({ enableEditing: isChecked });
  }

  onOnDemandImagesChange = (isChecked: boolean): void => {
    updatePreferencesData({ onDemandImages: isChecked });
  }

  onCurrentLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ currentLanguage: event.target.value });
  }

  onServerSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({ server: event.target.value });
  }

  onFallbackLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ fallbackLanguage: event.target.value });
  }

  onExcludedLibraryCheckboxChange = (library: string): void => {
    const excludedRandomLibraries = [ ...this.props.preferencesData.excludedRandomLibraries ];

    const index = excludedRandomLibraries.findIndex(item => item === library);
    if (index !== -1) {
      excludedRandomLibraries.splice(index, 1);
    } else {
      excludedRandomLibraries.push(library);
    }

    updatePreferencesData({ excludedRandomLibraries });
  }

  onRemoveAppPathOverride = (index: number): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths.splice(index, 1);
    console.log('SPLICED');
    updatePreferencesData({ appPathOverrides: newPaths });
  }

  onNewAppPathOverride = (): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths.push({path: '', override: ''});
    updatePreferencesData({ appPathOverrides: newPaths });
  }

  onAppPathOverridePathChange = (index: number, newPath: string): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths[index].path = newPath;
    updatePreferencesData({ appPathOverrides: newPaths });
  }

  onAppPathOverrideOverrideChange = (index: number, newOverride: string): void => {
    const newPaths = [...this.props.preferencesData.appPathOverrides];
    newPaths[index].override = newOverride;
    updatePreferencesData({ appPathOverrides: newPaths });
  }

  onNativeCheckboxChange = (platform: string): void => {
    const newPlatforms = [...this.state.nativePlatforms];
    const index = newPlatforms.findIndex(item => item === platform);

    if (index !== -1) {
      log.info('launcher', `WE CHANGED ${platform} TO false`);
      newPlatforms.splice(index, 1);
    } else {
      log.info('launcher', `WE CHANGED ${platform} TO true`);
      newPlatforms.push(platform);
    }
    this.setState({ nativePlatforms: newPlatforms });
  }

  /** When the "FlashPoint Folder Path" input text is changed. */
  onFlashpointPathChange = async (filePath: string): Promise<void> => {
    this.setState({ flashpointPath: filePath });
    // Check if the file-path points at a valid FlashPoint folder
    const isValid = await isFlashpointValidCheck(filePath);
    this.setState({ isFlashpointPathValid: isValid });
  }

  onUseCustomTitlebarChange = (isChecked: boolean): void => {
    this.setState({ useCustomTitlebar: isChecked });
  }

  onShowDeveloperTab = (isChecked: boolean): void => {
    updatePreferencesData({ showDeveloperTab: isChecked });
  }

  onMetadataServerHostChange = async (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): Promise<void> => {
    this.setState({ metadataServerHost: event.currentTarget.value });
  }

  onCurrentThemeChange = (value: string): void => {
    const selectedTheme = this.props.themeList.find(t => t.id === value);
    if (selectedTheme) {
      const suggestedLogoSet = this.props.logoSets.find(ls => ls.id === selectedTheme.logoSet);
      const logoSetId = suggestedLogoSet ? suggestedLogoSet.id : this.props.preferencesData.currentLogoSet;
      updatePreferencesData({ currentTheme: selectedTheme.id, currentLogoSet: logoSetId });
    }
  }

  onCurrentLogoSetChange = (value: string): void => {
    updatePreferencesData({ currentLogoSet: value });
  }

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
  }

  onCurrentLogoSetSelect = (value: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered logo sets.
    //       Directly after that comes the "No Theme" suggestion.
    let logoSet: ILogoSet | undefined;
    if (index < this.props.logoSets.length) { // (Select a Logo Set)
      logoSet = this.props.logoSets[index];
    } else { logoSet = undefined; } // (Deselect the current logo set)
    updatePreferencesData({ currentLogoSet: logoSet ? logoSet.id : '' });
  }

  getThemeName(id: string) {
    const theme = this.props.themeList.find(t => t.id === id);
    if (theme) { return theme.meta.name || theme.id; }
  }

  getLogoSetName(id: string) {
    const logoSet = this.props.logoSets.find(ls => ls.id === id);
    if (logoSet) { return logoSet.name; }
  }

  /** When the "Save & Restart" button is clicked. */
  onSaveAndRestartClick = () => {
    // Save new config to file, then restart the app
    window.Shared.back.send<any, UpdateConfigData>(BackIn.UPDATE_CONFIG, {
      flashpointPath: this.state.flashpointPath,
      metadataServerHost: this.state.metadataServerHost,
      useCustomTitlebar: this.state.useCustomTitlebar,
      nativePlatforms: this.state.nativePlatforms,
      server: this.state.server,
    }, () => { window.Shared.restart(); });
  }

  static contextType = LangContext;
}

/** Format a theme item into a displayable name for the themes drop-down. */
function formatThemeItemName(item: ITheme): string {
  return `${item.meta.name} (${item.id})`;
}

function formatLogoSetName(item: ILogoSet): string {
  return `${item.name} (${item.id})`;
}
