import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { BackIn, TagGetData, TagGetResponse } from '@shared/back/types';
import { LangContainer } from '@shared/lang';
import { deepCopy } from '@shared/Util';
import { remote } from 'electron';
import * as React from 'react';
import { WithPreferencesProps } from '../containers/withPreferences';
import { LangContext } from '../util/lang';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { DropdownInputField } from './DropdownInputField';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { TagAliasInputField } from './TagAliasInputField';
import { SketchPicker, ColorResult } from 'react-color';

type OwnProps = {
  /** Currently selected tag category (if any) */
  currentCategory?: TagCategory;
  /** If the "edit mode" is currently enabled */
  isEditing: boolean;

  onEditClick: () => void;
  onDiscardClick: () => void;
  onSaveCategory: () => void;
  onDeleteCategory: () => void;

  onEditCategory: (tag: Partial<TagCategory>) => void;
};

export type RightTagCategoriesSidebarProps = OwnProps & WithPreferencesProps;

type RRightTagCategoriesSidebarState = {
  currentTagInput: string;
};

export interface RightTagCategoriesSidebar {
  context: LangContainer;
}

/** Sidebar on the right side of BrowsePage. */
export class RightTagCategoriesSidebar extends React.Component<RightTagCategoriesSidebarProps, RRightTagCategoriesSidebarState> {

  launchCommandRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: RightTagCategoriesSidebarProps) {
    super(props);
    this.state = {
      currentTagInput: ''
    };
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  render() {
    const allStrings = this.context;
    const strings = this.context.tags;
    const category: TagCategory | undefined = this.props.currentCategory;
    if (category) {
      const { isEditing, preferencesData } = this.props;
      const editDisabled = !preferencesData.enableEditing;
      const editable = !editDisabled && isEditing;
      return (
        <div
          className={'browse-right-sidebar ' + (editable ? 'browse-right-sidebar--edit-enabled' : 'browse-right-sidebar--edit-disabled')}
          onKeyDown={this.onLocalKeyDown}>
          {/* -- Title & Developer(s) -- */}
          <div className='browse-right-sidebar__section'>
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__title-row'>
                <div className='browse-right-sidebar__title-row__title'>
                  <InputField
                    text={category.name}
                    editable={editable}
                    onChange={this.onNameChange}
                    placeholder={strings.noName} />
                </div>
                <div className='browse-right-sidebar__title-row__buttons'>
                  { editDisabled ? undefined : (
                    <>
                      { isEditing ? ( /* While Editing */
                        <>
                          {/* "Save" Button */}
                          <div
                            className='browse-right-sidebar__title-row__buttons__save-button'
                            title={allStrings.browse.saveChanges}
                            onClick={this.props.onSaveCategory}>
                            <OpenIcon icon='check' />
                          </div>
                          {/* "Discard" Button */}
                          <div
                            className='browse-right-sidebar__title-row__buttons__discard-button'
                            title={allStrings.browse.discardChanges}
                            onClick={this.props.onDiscardClick}>
                            <OpenIcon icon='x' />
                          </div>
                        </>
                      ) : ( /* While NOT Editing */
                        <>
                          {/* "Edit" Button */}
                        <div
                          className='browse-right-sidebar__title-row__buttons__edit-button'
                          title={strings.editTag}
                          onClick={this.props.onEditClick}>
                          <OpenIcon icon='pencil' />
                        </div>
                        <ConfirmElement
                          onConfirm={this.onDeleteCategoryClick}
                          children={this.renderDeleteCategoryButton}
                          extra={allStrings.tags} />
                        </>
                      ) }
                    </>
                  ) }
                </div>
              </div>
            </div>
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.description}: </p>
                <InputField
                  text={category.description || ''}
                  placeholder={strings.noDescription}
                  onChange={this.onDescriptionChange}
                  editable={editable}
                  onKeyDown={this.onInputKeyDown} />
              </div>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.color}: </p>
                { editable ? (
                  <SketchPicker
                    color={category.color}
                    onChange={this.onColorChange}/>
                ) : (
                  <div className='tag-categories__color-preview'
                    style={{ backgroundColor: category.color }}>
                    {category.color.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className='browse-right-sidebar-empty'>
          <h1>{strings.noTagSelected}</h1>
          <p>{strings.clickToSelectTag}</p>
        </div>
      );
    }
  }

  renderDeleteCategoryButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['tags']>): JSX.Element {
    const className = 'tag-category__buttons-delete';
    return (
      <div
        className={className + ((activationCounter > 0) ? ` ${className}--active simple-vertical-shake` : '')}
        title={extra.deleteTagCategory}
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='trash' />
      </div>
    );
  }

  /** When a key is pressed down "globally" (and this component is present) */
  onGlobalKeyDown = (event: KeyboardEvent) => {
    // Start editing
    if (event.ctrlKey && event.code === 'KeyE' && // (CTRL + E ...
        !this.props.isEditing && this.props.currentCategory) { // ... while not editing, and a game is selected)
      this.props.onEditClick();
      if (this.launchCommandRef.current) { this.launchCommandRef.current.focus(); }
      event.preventDefault();
    }
  }

  onLocalKeyDown = (event: React.KeyboardEvent) => {
    // Save changes
    if (event.ctrlKey && event.key === 's' && // (CTRL + S ...
        this.props.isEditing && this.props.currentCategory) { // ... while editing, and a game is selected)
      this.props.onSaveCategory();
      event.preventDefault();
    }
  }

  onNameChange = (event: React.ChangeEvent<InputElement>) => {
    this.props.onEditCategory({ name: event.currentTarget.value });
  }

  onDescriptionChange = (event: React.ChangeEvent<InputElement>) => {
    this.props.onEditCategory({ description: event.currentTarget.value });
  }

  onColorChange = (color: ColorResult) => {
    this.props.onEditCategory({ color: color.hex });
  }

  onCurrentTagChange = (event: React.ChangeEvent<InputElement>) => {
    this.setState({ currentTagInput: event.currentTarget.value });
  }

  /** When a key is pressed while an input field is selected (except for multiline fields) */
  onInputKeyDown = (event: React.KeyboardEvent): void => {
    // if (event.key === 'Enter') { this.props.onSaveGame(); }
  }

  onDeleteCategoryClick = (): void => {
    console.log('clalled');
    if (this.props.onDeleteCategory) {
      this.props.onDeleteCategory();
    }
  }

  static contextType = LangContext;
}
