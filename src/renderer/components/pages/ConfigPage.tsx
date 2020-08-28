import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { BackIn, UpdateConfigData } from '@shared/back/types';
import { IExtensionDescription, ILogoSet } from '@shared/extensions/interfaces';
import { autoCode, LangContainer, LangFile } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { ITheme } from '@shared/ThemeFile';
import { formatString } from '@shared/utils/StringFormatter';
import * as React from 'react';
import { getExtIconURL, getPlatformIconURL, isFlashpointValidCheck } from '../../Util';
import { LangContext } from '../../util/lang';
import { CheckBox } from '../CheckBox';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { Dropdown } from '../Dropdown';
import { DropdownInputField } from '../DropdownInputField';
import { InputField } from '../InputField';

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
  /** Reference to the input element of the "current theme" drop-down field. */
  currentThemeInputRef: HTMLInputElement | HTMLTextAreaElement | null = null;
  currentLogoSetInputRef: HTMLInputElement | HTMLTextAreaElement | null = null;

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
    const libraryStrings = this.context.libraries;
    const strings = this.context.config;
    const { platforms, libraries } = this.props;
    const { nativePlatforms } = this.state;
    const autoString = formatString(strings.auto, this.props.localeCode);
    const langOptions = this.renderLangOptionsMemo(this.props.availableLangs);
    const serverOptions = this.renderServerOptionsMemo(this.props.serverNames);
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
                <div className='setting__row'>
                  <div className='setting__row__top'>
                    <div className='setting__row__title'>
                      <p>{strings.extremeGames}</p>
                    </div>
                    <div className='setting__row__content setting__row__content--toggle'>
                      <div>
                        <CheckBox
                          checked={this.props.preferencesData.browsePageShowExtreme}
                          onToggle={this.onShowExtremeChange} />
                      </div>
                    </div>
                  </div>
                  <div className='setting__row__bottom'>
                    <p>{strings.extremeGamesDesc}</p>
                  </div>
                </div>
              ) : undefined }
              {/* Enable Editing */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.enableEditing}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox
                        checked={this.props.preferencesData.enableEditing}
                        onToggle={this.onEnableEditingChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.enableEditingDesc}</p>
                </div>
              </div>
              {/* On Demand Images */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.onDemandImages}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox
                        checked={this.props.preferencesData.onDemandImages}
                        onToggle={this.onOnDemandImagesChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.onDemandImagesDesc}</p>
                </div>
              </div>
              {/* Current Language */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.currentLanguage}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <select
                        className='simple-selector'
                        value={this.props.preferencesData.currentLanguage || ''}
                        onChange={this.onCurrentLanguageSelect}>
                        <option value={autoCode}>{autoString}</option>
                        {langOptions}
                      </select>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.currentLanguageDesc}</p>
                </div>
              </div>
            </div>
          </div>
          {/* -- Flashpoint -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.flashpointHeader}</p>
            <div className='setting__body'>
              {/* Flashpoint Path */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <p className='setting__row__title'>{strings.flashpointPath}</p>
                  <div className='setting__row__content setting__row__content--filepath-path'>
                    <ConfigFlashpointPathInput
                      input={this.state.flashpointPath}
                      buttonText={strings.browse}
                      onInputChange={this.onFlashpointPathChange}
                      isValid={this.state.isFlashpointPathValid} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.flashpointPathDesc}</p>
                </div>
              </div>
              {/* Random Libraries */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.randomLibraries}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <Dropdown text={strings.libraries}>
                        { libraries.map((library, index) => (
                          <label
                            key={index}
                            className='log-page__dropdown-item'>
                            <div className='simple-center'>
                              {/** We flip the checked value so the render shows Included, but we keep them as Excluded */}
                              <input
                                type='checkbox'
                                checked={this.props.preferencesData.excludedRandomLibraries.findIndex((item) => item === library) === -1}
                                onChange={() => { this.onExcludedLibraryCheckboxChange(library); }}
                                className='simple-center__vertical-inner' />
                            </div>
                            <div className='simple-center'>
                              <p className='simple-center__vertical-inner log-page__dropdown-item-text'>
                                {libraryStrings[library] || library}
                              </p>
                            </div>
                          </label>
                        )) }
                      </Dropdown>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.randomLibrariesDesc}</p>
                </div>
              </div>
              {/* Native Platforms */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.nativePlatforms}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <Dropdown text={strings.platforms}>
                        { platforms.map((platform, index) => (
                          <label
                            key={index}
                            className='log-page__dropdown-item'>
                            <div className='simple-center'>
                              <input
                                type='checkbox'
                                checked={nativePlatforms.findIndex((item) => item === platform) !== -1}
                                onChange={() => { this.onNativeCheckboxChange(platform); }}
                                className='simple-center__vertical-inner' />
                            </div>
                            <div className='simple-center'>
                              <p className='simple-center__vertical-inner log-page__dropdown-item-text'>
                                {platform}
                              </p>
                            </div>
                          </label>
                        )) }
                      </Dropdown>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.nativePlatformsDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Visuals -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.visualsHeader}</p>
            <div className='setting__body'>
              {/* Custom Title Bar */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.useCustomTitleBar}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox
                        checked={this.state.useCustomTitlebar}
                        onToggle={this.onUseCustomTitlebarChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.useCustomTitleBarDesc}</p>
                </div>
              </div>
              {/* Theme */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.theme}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--input-field setting__row__content--theme-input-field'>
                    <DropdownInputField
                      text={this.getThemeName(this.props.preferencesData.currentTheme || '') || ''}
                      placeholder={strings.noTheme}
                      onChange={this.onCurrentThemeChange}
                      editable={true}
                      items={[ ...this.props.themeList.map(formatThemeItemName), 'No Theme' ]}
                      onItemSelect={this.onCurrentThemeItemSelect}
                      inputRef={this.currentThemeInputRefFunc} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.themeDesc}</p>
                </div>
              </div>
              {/* Logo Set */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.logoSet}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--input-field setting__row__content--theme-input-field'>
                    <DropdownInputField
                      text={this.getLogoSetName(this.props.preferencesData.currentLogoSet || '') || ''}
                      placeholder={strings.noLogoSet}
                      onChange={this.onCurrentLogoSetChange}
                      editable={true}
                      items={[ ...this.props.logoSets.map(formatLogoSetName), 'No Logo Set' ]}
                      onItemSelect={this.onCurrentLogoSetSelect}
                      inputRef={this.currentLogoSetInputRefFunc} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.logoSetDesc}</p>
                  {logoSetPreviewRows}
                </div>
              </div>
            </div>
          </div>

          {/* -- Advanced -- */}
          <div className='setting'>
            <p className='setting__title'>{strings.advancedHeader}</p>
            <div className='setting__body'>
              {/* Show Developer Tab */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.showDeveloperTab}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox
                        checked={this.props.preferencesData.showDeveloperTab}
                        onToggle={this.onShowDeveloperTab} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.showDeveloperTabDesc}</p>
                </div>
              </div>
              {/* Server */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.server}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <select
                        className='simple-selector'
                        value={this.state.server}
                        onChange={this.onServerSelect}>
                        {serverOptions}
                      </select>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.serverDesc}</p>
                </div>
              </div>
              {/* Metadata Server Host */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <p className='setting__row__title'>{strings.metadataServerHost}</p>
                  <div className='setting__row__content setting__row__content--filepath-path'>
                    <InputField
                      editable={true}
                      text={this.state.metadataServerHost}
                      onChange={this.onMetadataServerHostChange} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.metadataServerHostDesc}</p>
                </div>
              </div>
              {/* Fallback Language */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.fallbackLanguage}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <select
                        className='simple-selector'
                        value={this.props.preferencesData.fallbackLanguage || ''}
                        onChange={this.onFallbackLanguageSelect}>
                        <option value='<none>'>None</option>
                        <option value={autoCode}>{autoString}</option>
                        {langOptions}
                      </select>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.fallbackLanguageDesc}</p>
                </div>
              </div>
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

  renderLangOptionsMemo = memoizeOne((langs: LangFile[]) =>
    langs.map((lang, index) => (
      <option
        key={index}
        value={lang.code}>
        {lang.data.name ? `${lang.data.name} (${lang.code})` : lang.code}
      </option>
    ))
  );

  renderServerOptionsMemo = memoizeOne((serverNames: string[]) =>
    serverNames.map((name, index) => (
      <option
        key={index}
        value={name}>
        {name}
      </option>
    ))
  );

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
        if (ext.contributes.devScripts) {
          shortContribs.push(
            <div key='devScripts'>
              {`${ext.contributes.devScripts.length} ${strings.extDevScripts}`}
            </div>
          );
        }
        if (ext.contributes.themes) {
          shortContribs.push(
            <div key='themes'>
              {`${ext.contributes.themes.length} ${strings.extThemes}`}
            </div>
          );
        }
        if (ext.contributes.logoSets) {
          shortContribs.push(
            <div key='logoSets'>
              {`${ext.contributes.logoSets.length} ${strings.extLogoSets}`}
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

  onNativeCheckboxChange = (platform: string): void => {
    const { nativePlatforms } = this.state;
    const index = nativePlatforms.findIndex(item => item === platform);

    if (index !== -1) {
      nativePlatforms.splice(index, 1);
    } else {
      nativePlatforms.push(platform);
    }
    this.setState({ nativePlatforms: nativePlatforms });
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

  onCurrentThemeChange = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): void => {
    const selectedTheme = this.props.themeList.find(t => t.id === event.currentTarget.value);
    if (selectedTheme) {
      const suggestedLogoSet = this.props.logoSets.find(ls => ls.id === selectedTheme.logoSet);
      const logoSetId = suggestedLogoSet ? suggestedLogoSet.id : this.props.preferencesData.currentLogoSet;
      updatePreferencesData({ currentTheme: selectedTheme.id, currentLogoSet: logoSetId });
    }
  }

  onCurrentLogoSetChange = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): void => {
    updatePreferencesData({ currentLogoSet: event.currentTarget.value });
  }

  onCurrentThemeItemSelect = (text: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered themes.
    //       Directly after that comes the "No Theme" suggestion.
    let theme: ITheme | undefined;
    if (index < this.props.themeList.length) { // (Select a Theme)
      theme = this.props.themeList[index];
    } else { theme = undefined; } // (Deselect the current theme)
    const suggestedLogoSet = this.props.logoSets.find(ls => ls.id === (theme ? theme.logoSet : undefined));
    const logoSetId = suggestedLogoSet ? suggestedLogoSet.id : this.props.preferencesData.currentLogoSet;
    updatePreferencesData({ currentTheme: theme ? theme.id : '', currentLogoSet: logoSetId });
    // Select the input field
    if (this.currentThemeInputRef) {
      this.currentThemeInputRef.focus();
    }
  }

  onCurrentLogoSetSelect = (text: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" registered logo sets.
    //       Directly after that comes the "No Theme" suggestion.
    let logoSet: ILogoSet | undefined;
    if (index < this.props.logoSets.length) { // (Select a Logo Set)
      logoSet = this.props.logoSets[index];
    } else { logoSet = undefined; } // (Deselect the current logo set)
    updatePreferencesData({ currentLogoSet: logoSet ? logoSet.id : '' });
    // Select the input field
    if (this.currentLogoSetInputRef) {
      this.currentLogoSetInputRef.focus();
    }
  }

  currentThemeInputRefFunc = (ref: HTMLInputElement | HTMLTextAreaElement | null): void => {
    this.currentThemeInputRef = ref;
  }

  currentLogoSetInputRefFunc = (ref: HTMLInputElement | HTMLTextAreaElement | null): void => {
    this.currentLogoSetInputRef = ref;
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
