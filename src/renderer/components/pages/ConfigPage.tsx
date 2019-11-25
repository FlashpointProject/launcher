import { remote } from 'electron';
import * as path from 'path';
import * as React from 'react';
import * as which from 'which';
import { WithPreferencesProps } from '../../../renderer/containers/withPreferences';
import { AddLogData, BackIn } from '../../../shared/back/types';
import { isFlashpointValidCheck } from '../../../shared/checkSanity';
import { autoCode, LangContainer, LangFile } from '../../../shared/lang';
import { memoizeOne } from '../../../shared/memoize';
import { updatePreferencesData } from '../../../shared/preferences/util';
import { Theme } from '../../../shared/ThemeFile';
import { formatString } from '../../../shared/utils/StringFormatter';
import { LangContext } from '../../util/lang';
import { CheckBox } from '../CheckBox';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { DropdownInputField } from '../DropdownInputField';

type OwnProps = {
  /** Filenames of all files in the themes folder. */
  themeList: Theme[];
  /** List of available languages. */
  availableLangs: LangFile[];
};

export type ConfigPageProps = OwnProps & WithPreferencesProps;

type ConfigPageState = {
  /** If the currently entered Flashpoint path points to a "valid" Flashpoint folder (it exists and "looks" like a Flashpoint folder). */
  isFlashpointPathValid?: boolean;
  /** Currently entered Flashpoint path. */
  flashpointPath: string;
  /** If the "use custom title bar" checkbox is checked. */
  useCustomTitlebar: boolean;
  /** If the "use fiddler" checkbox is checked. */
  useFiddler: boolean;
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
  /** Country code if the local machine (used to detect which language to use for "auto"). */
  countryCode: string = remote.app.getLocaleCountryCode().toLowerCase();

  constructor(props: ConfigPageProps) {
    super(props);
    const configData = window.External.config.data;
    this.state = {
      isFlashpointPathValid: undefined,
      flashpointPath: configData.flashpointPath,
      useCustomTitlebar: configData.useCustomTitlebar,
      useFiddler: configData.useFiddler,
    };
  }

  render() {
    const strings = this.context.config;
    const autoString = formatString(strings.auto, this.countryCode);
    const langOptions = this.renderLangOptionsMemo(this.props.availableLangs);
    return (
      <div className='config-page simple-scroll'>
        <div className='config-page__inner'>
          <h1 className='config-page__title'>{strings.configHeader}</h1>
          <i>{strings.configDesc}</i>

          {/* -- Preferences -- */}
            <div className='setting'>
              <p className='setting__title'>{strings.preferencesHeader}</p>
              <div className='setting__body'>
                {/* Show Extreme Games */}
                {((!window.External.config.data.disableExtremeGames)) ? (
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
              {/* Redirector / Fiddler */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.redirector}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--redirector'>
                    <div>
                      <input
                        type='radio'
                        checked={!this.state.useFiddler}
                        onChange={this.onRedirectorRedirectorChange} />
                      <p>{strings.redirector}</p>
                    </div>
                    <div>
                      <input
                        type='radio'
                        checked={this.state.useFiddler}
                        onChange={this.onRedirectorFiddlerChange} />
                      <p>{strings.redirectorFiddler}</p>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.redirectorDesc}</p>
                </div>
              </div>
              {/* Wine */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>{strings.useWine}</p>
                  </div>
                  <div className='setting__row__content setting__row__content--toggle'>
                    <div>
                      <CheckBox
                        checked={this.props.preferencesData.useWine}
                        onToggle={this.useWineChange} />
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.useWineDesc}</p>
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
                      text={this.props.preferencesData.currentTheme || ''}
                      placeholder={strings.noTheme}
                      onChange={this.onCurrentThemeChange}
                      editable={true}
                      items={[ ...this.props.themeList.map(formatThemeItemName), 'No Theme' ]}
                      onItemSelect={this.onCurrentThemeItemSelect}
                      inputRef={this.currentThemeInputRefFunc}
                      />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>{strings.themeDesc}</p>
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

  onShowExtremeChange = (isChecked: boolean): void => {
    updatePreferencesData({ browsePageShowExtreme: isChecked });
    this.forceUpdate();
  }

  onEnableEditingChange = (isChecked: boolean): void => {
    updatePreferencesData({ enableEditing: isChecked });
    this.forceUpdate();
  }

  onCurrentLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ currentLanguage: event.target.value });
  }

  onFallbackLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    updatePreferencesData({ fallbackLanguage: event.target.value });
  }

  onRedirectorRedirectorChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ useFiddler: !event.target.checked });
  }
  onRedirectorFiddlerChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ useFiddler: event.target.checked });
  }

  /** When the "FlashPoint Folder Path" input text is changed. */
  onFlashpointPathChange = async (filePath: string): Promise<void> => {
    this.setState({ flashpointPath: filePath });
    // Check if the file-path points at a valid FlashPoint folder
    const isValid = await isFlashpointValidCheck(filePath);
    this.setState({ isFlashpointPathValid: isValid });
  }

  useWineChange = (isChecked: boolean): void => {
    updatePreferencesData({ useWine: isChecked });
    this.forceUpdate();

    if (isChecked && process.platform === 'linux') {
      which('wine', (err) => {
        if (err) {
          log('Warning: Wine was enabled but it was not found on the path.');
          remote.dialog.showMessageBox({
            type: 'error',
            title: this.context.dialog.programNotFound,
            message: this.context.dialog.wineNotFound,
            buttons: ['Ok'],
          });
        }
      });
    }
  }

  onUseCustomTitlebarChange = (isChecked: boolean): void => {
    this.setState({ useCustomTitlebar: isChecked });
  }

  onShowDeveloperTab = (isChecked: boolean): void => {
    updatePreferencesData({ showDeveloperTab: isChecked });
    this.forceUpdate();
  }

  onCurrentThemeChange = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): void => {
    updatePreferencesData({ currentTheme: event.currentTarget.value });
  }

  onCurrentThemeItemSelect = (text: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" are filenames of themes.
    //       Directly after that comes the "No Theme" suggestion.
    let theme: string | undefined;
    if (index < this.props.themeList.length) { // (Select a Theme)
      theme = this.props.themeList[index].entryPath;
    } else { theme = undefined; } // (Deselect the current theme)
    updatePreferencesData({ currentTheme: theme });
    // Select the input field
    if (this.currentThemeInputRef) {
      this.currentThemeInputRef.focus();
    }
  }

  currentThemeInputRefFunc = (ref: HTMLInputElement | HTMLTextAreaElement | null): void => {
    this.currentThemeInputRef = ref;
  }

  /** When the "Save & Restart" button is clicked. */
  onSaveAndRestartClick = () => {
    // Save new config to file, then restart the app
    window.External.back.send(BackIn.UPDATE_CONFIG, {
      flashpointPath: this.state.flashpointPath,
      useCustomTitlebar: this.state.useCustomTitlebar,
      useFiddler: this.state.useFiddler,
    }, () => { window.External.restart(); });
  }

  static contextType = LangContext;
}

/** Format a theme item into a displayable name for the themes drop-down. */
function formatThemeItemName(item: Theme): string {
  return `${item.meta.name} (${item.entryPath})`;
}

function log(content: string): void {
  window.External.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Game Launcher',
    content: content,
  });
}
