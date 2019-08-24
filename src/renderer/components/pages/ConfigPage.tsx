import * as path from 'path';
import * as React from 'react';
import { WithPreferencesProps } from '../../../renderer/containers/withPreferences';
import { isFlashpointValidCheck } from '../../../shared/checkSanity';
import { deepCopy, recursiveReplace } from '../../../shared/Util';
import { IThemeListItem } from '../../theme/ThemeManager';
import { CheckBox } from '../CheckBox';
import { ConfigFlashpointPathInput } from '../ConfigFlashpointPathInput';
import { DropdownInputField } from '../DropdownInputField';
import { remote } from 'electron';
import which = require('which');
import { LangContext } from '../../util/lang';
import { ConfigLang } from '../../../shared/lang/types';

type OwnProps = {
  /** Filenames of all files in the themes folder. */
  themeItems: IThemeListItem[];
  /** Load and apply a theme. */
  reloadTheme(themePath: string | undefined): void;
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

/**
 * A page displaying some of the current "configs" / "preferences", as well as a way of changing them.
 * All changed "configs" (settings stored in "config.json") require you to "Save & Restart" to take effect.
 * The changed "preferences" (settings stored in "preferences.json") do not require a restart, and are updated directly.
 * @TODO Make it clear which settings are "configs" and which are "preferences" (or at least which require you to "save & restart")?
 */
export class ConfigPage extends React.Component<ConfigPageProps, ConfigPageState> {
  /** Reference to the input element of the "current theme" drop-down field. */
  currentThemeInputRef: HTMLInputElement | HTMLTextAreaElement | null = null;

  static contextType = LangContext;

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
    const strings : ConfigLang = this.context.config;
    console.log(strings);

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
                      onKeyDown={this.onCurrentThemeKeyDown}
                      items={[ ...this.props.themeItems.map(formatThemeItemName), 'No Theme' ]}
                      onItemSelect={this.onCurrentThemeItemSelect}
                      inputRef={this.currentThemeInputRefFunc}
                      />
                    <input
                      type='button'
                      value={strings.browse}
                      className='simple-button'
                      onClick={this.onCurrentThemeBrowseClick} />
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

  onShowExtremeChange = (isChecked: boolean): void => {
    this.props.updatePreferences({ browsePageShowExtreme: isChecked });
    this.forceUpdate();
  }

  onEnableEditingChange = (isChecked: boolean): void => {
    this.props.updatePreferences({ enableEditing: isChecked });
    this.forceUpdate();
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
    this.props.updatePreferences({ useWine: isChecked });
    this.forceUpdate();

    if (isChecked && process.platform === 'linux') {
      which('wine', function(err: Error | null) {
        if (err) {
          log('Warning : Wine was enabled but it was not found on the path.');
          remote.dialog.showMessageBox({
            type: 'error',
            title: 'Program not found!',
            message: 'Wine was enabled but not found on the path. Is it installed?\n' +
                    'Some games may not be available without Wine',
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
    this.props.updatePreferences({ showDeveloperTab: isChecked });
    this.forceUpdate();
  }

  onCurrentThemeChange = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): void => {
    this.props.updatePreferences({ currentTheme: event.currentTarget.value });
  }

  onCurrentThemeKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      // Load the entered theme
      this.props.reloadTheme(this.props.preferencesData.currentTheme);
    }
  }

  onCurrentThemeItemSelect = (text: string, index: number): void => {
    // Note: Suggestions with index 0 to "length - 1" are filenames of themes.
    //       Directly after that comes the "No Theme" suggestion.
    let theme: string | undefined;
    if (index < this.props.themeItems.length) { // (Select a Theme)
      theme = this.props.themeItems[index].entryPath;
    } else { theme = undefined; } // (Deselect the current theme)
    this.props.updatePreferences({ currentTheme: theme });
    this.props.reloadTheme(theme);
    // Select the input field
    if (this.currentThemeInputRef) {
      this.currentThemeInputRef.focus();
    }
  }

  onCurrentThemeBrowseClick = (event: React.MouseEvent): void => {
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialogSync({
      title: 'Select a theme file',
      properties: ['openFile'],
    });
    if (filePaths) {
      // Get the selected files path relative to the themes folder
      const filePath = filePaths[0] || '';
      const themeFolderPath = path.join(
        window.External.config.fullFlashpointPath,
        window.External.config.data.themeFolderPath
      );
      const relativePath = path.relative(themeFolderPath, filePath);
      // Update current theme
      this.props.updatePreferences({ currentTheme: relativePath });
      // Reload theme
      this.props.reloadTheme(relativePath);
    }
  }

  currentThemeInputRefFunc = (ref: HTMLInputElement | HTMLTextAreaElement | null): void => {
    this.currentThemeInputRef = ref;
  }

  /** When the "Save & Restart" button is clicked. */
  onSaveAndRestartClick = () => {
    // Create new config
    let newConfig = recursiveReplace(deepCopy(window.External.config.data), {
      flashpointPath: this.state.flashpointPath,
      useCustomTitlebar: this.state.useCustomTitlebar,
      useFiddler: this.state.useFiddler,
    });
    // Save new config to file, then restart the app
    window.External.config.save(newConfig)
    .then(() => { window.External.restart(); })
    .catch((error: Error) => { console.log(error); });
  }
}

/** Format a theme item into a displayable name for the themes drop-down. */
function formatThemeItemName(item: IThemeListItem): string {
  return `${item.metaData.name} (${item.basename})`;
}

function log(str: string): void {
  window.External.log.addEntry({
    source: 'Config',
    content: str,
  });
}