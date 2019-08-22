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
    return (
      <div className='config-page simple-scroll'>
        <div className='config-page__inner'>
          <h1 className='config-page__title'>Config</h1>
          <i>(You must press 'Save & Restart' for some changes to take effect)</i>

          {/* -- Preferences -- */}
            <div className='setting'>
              <p className='setting__title'>Preferences</p>
              <div className='setting__body'>
                {/* Show Extreme Games */}
                {((!window.External.config.data.disableExtremeGames)) ? (
                  <div className='setting__row'>
                    <div className='setting__row__top'>
                      <div className='setting__row__title'>
                        <p>Show Extreme Games</p>
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
                      <p>Show games with sexual, violent or other content unsuitable for children.</p>
                    </div>
                  </div>
                ) : undefined }
                {/* Enable Editing */}
                <div className='setting__row'>
                  <div className='setting__row__top'>
                    <div className='setting__row__title'>
                      <p>Enable Editing</p>
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
                    <p>Enable editing of games, additional applications and playlists. Also shows the "Curate" tab.</p>
                  </div>
                </div>
              </div>
            </div>

          {/* -- Flashpoint -- */}
          <div className='setting'>
            <p className='setting__title'>Flashpoint</p>
            <div className='setting__body'>
              {/* Flashpoint Path */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <p className='setting__row__title'>Flashpoint Path</p>
                  <div className='setting__row__content setting__row__content--filepath-path'>
                    <ConfigFlashpointPathInput
                      input={this.state.flashpointPath}
                      onInputChange={this.onFlashpointPathChange}
                      isValid={this.state.isFlashpointPathValid} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Path to the Flashpoint folder (can be relative)</p>
                </div>
              </div>
              {/* Redirector / Fiddler */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Redirector</p>
                  </div>
                  <div className='setting__row__content setting__row__content--redirector'>
                    <div>
                      <input
                        type='radio'
                        checked={!this.state.useFiddler}
                        onChange={this.onRedirectorRedirectorChange} />
                      <p>Redirector</p>
                    </div>
                    <div>
                      <input
                        type='radio'
                        checked={this.state.useFiddler}
                        onChange={this.onRedirectorFiddlerChange} />
                      <p>Fiddler</p>
                    </div>
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>Which software to use for redirecting the game traffic to the local web server. Neither is used on Linux.</p>
                </div>
              </div>
              {/* Wine */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Use Wine</p>
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
                  <p>Launch applications with Wine. Only enable this if Wine is installed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Visuals -- */}
          <div className='setting'>
            <p className='setting__title'>Visuals</p>
            <div className='setting__body'>
              {/* Custom Title Bar */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Use Custom Title Bar</p>
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
                  <p>Use a custom title bar at the top of this window.</p>
                </div>
              </div>
              {/* Theme */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Theme</p>
                  </div>
                  <div className='setting__row__content setting__row__content--input-field setting__row__content--theme-input-field'>
                    <DropdownInputField
                      text={this.props.preferencesData.currentTheme || ''}
                      placeholder='No Theme'
                      onChange={this.onCurrentThemeChange}
                      editable={true}
                      onKeyDown={this.onCurrentThemeKeyDown}
                      items={[ ...this.props.themeItems.map(formatThemeItemName), 'No Theme' ]}
                      onItemSelect={this.onCurrentThemeItemSelect}
                      inputRef={this.currentThemeInputRefFunc}
                      />
                    <input
                      type='button'
                      value='Browse'
                      className='simple-button'
                      onClick={this.onCurrentThemeBrowseClick} />
                  </div>
                </div>
                <div className='setting__row__bottom'>
                  <p>File path of the theme to use (relative to the themes folder).</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Advanced -- */}
          <div className='setting'>
            <p className='setting__title'>Advanced</p>
            <div className='setting__body'>
              {/* Show Developer Tab */}
              <div className='setting__row'>
                <div className='setting__row__top'>
                  <div className='setting__row__title'>
                    <p>Show Developer Tab</p>
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
                  <p>Show the "Developer" tab. This is most likely only useful for developers and curators.</p>
                </div>
              </div>
            </div>
          </div>

          {/* -- Save & Restart -- */}
          <div className='setting'>
            <div className='setting__row'>
              <input
                type='button'
                value='Save & Restart'
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