import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { BackIn, MergeTagData, TagGetData, TagGetResponse, TagSuggestion } from '@shared/back/types';
import { LangContainer } from '@shared/lang';
import { deepCopy } from '@shared/Util';
import { remote } from 'electron';
import * as React from 'react';
import { WithPreferencesProps } from '../containers/withPreferences';
import { LangContext } from '../util/lang';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { DropdownInputField } from './DropdownInputField';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';
import { TagAliasInputField } from './TagAliasInputField';
import { TagInputField } from './TagInputField';

type OwnProps = {
  /** Currently selected game (if any) */
  currentTag?: Tag;
  /** If the "edit mode" is currently enabled */
  isEditing: boolean;
  /** If this tag is locked while processing */
  isLocked: boolean;
  /** Tag Categories info */
  tagCategories: TagCategory[];

  onEditClick: () => void;
  onDiscardClick: () => void;
  onSaveTag: () => void;
  onDeleteTag: () => void;

  onEditTag: (tag: Partial<Tag>) => void;

  onSetTag: (tag: Tag) => void;
  onLockEdit: (locked: boolean) => void;
};

export type RightTagsSidebarProps = OwnProps & WithPreferencesProps;

type RightTagsSidebarState = {
  currentTagInput: string;
  currentTagMergeInput: string;
  tagMergeSuggestions: TagSuggestion[];
  makeAliasWhenMerged: boolean;
};

export interface RightTagsSidebar {
  context: LangContainer;
}

/** Sidebar on the right side of BrowsePage. */
export class RightTagsSidebar extends React.Component<RightTagsSidebarProps, RightTagsSidebarState> {

  launchCommandRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: RightTagsSidebarProps) {
    super(props);
    this.state = {
      currentTagInput: '',
      currentTagMergeInput: '',
      tagMergeSuggestions: [],
      makeAliasWhenMerged: false
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
    const tag: Tag | undefined = this.props.currentTag;
    if (tag) {
      const { isEditing, isLocked, preferencesData, tagCategories } = this.props;
      const editDisabled = !preferencesData.enableEditing;
      const editable = !editDisabled && isEditing;
      const category = tagCategories.find(c => c.id == tag.categoryId);
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
                    text={tag.primaryAlias.name}
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
                            onClick={this.props.onSaveTag}>
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
                          onConfirm={this.onDeleteTagClick}
                          children={this.renderDeleteTagButton}
                          extra={allStrings.tags} />
                        </>
                      ) }
                    </>
                  ) }
                </div>
              </div>
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <DropdownInputField
                items={this.props.tagCategories.map(c => c.name)}
                editable={this.props.isEditing}
                onItemSelect={this.onSelectCategory}
                text={category ? category.name : ''}
                />
            </div>
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.description}: </p>
                <InputField
                  text={tag.description || ''}
                  placeholder={strings.noDescription}
                  onChange={this.onDescriptionChange}
                  editable={editable}
                  onKeyDown={this.onInputKeyDown} />
              </div>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.aliases}: </p>
                <TagAliasInputField
                  text={this.state.currentTagInput}
                  placeholder={strings.enterAlias}
                  className='browse-right-sidebar__searchable'
                  editable={editable}
                  onChange={this.onCurrentTagChange}
                  primaryAliasId={tag.primaryAliasId}
                  aliases={tag.aliases}
                  onTagAliasSelect={this.onTagAliasSelect}
                  onTagAliasDelete={this.onRemoveTagAlias}
                  onTagAliasSubmit={this.onAddTagAliasByString}
                  onKeyDown={this.onInputKeyDown} />
              </div>
              { isEditing ? (
                <>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.mergeIntoTag}: </p>
                    <TagInputField
                      editable={true}
                      text={this.state.currentTagMergeInput}
                      tags={[]}
                      suggestions={this.state.tagMergeSuggestions}
                      onChange={this.onCurrentTagMergeChange}
                      onTagSuggestionSelect={this.onSelectTagMergeSuggestion}
                      categories={this.props.tagCategories} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.makeAliasWhenMerged} </p>
                    <CheckBox
                      checked={this.state.makeAliasWhenMerged}
                      onToggle={this.onMakeAliasWhenMergedToggle}
                      />
                  </div>
                  <SimpleButton
                    value={strings.mergeTag}
                    onClick={this.onMergeTag} />
                </>
              ) : undefined }
              { isLocked ? (
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line browse-right-sidebar__locked'>
                  {strings.locked}
                </div>
              ) : undefined }
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

  renderDeleteTagButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['tags']>): JSX.Element {
    const className = 'tag-alias__buttons-delete';
    return (
      <div
        className={className + ((activationCounter > 0) ? ` ${className}--active simple-vertical-shake` : '')}
        title={extra.deleteTag}
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
        !this.props.isEditing && this.props.currentTag) { // ... while not editing, and a game is selected)
      this.props.onEditClick();
      if (this.launchCommandRef.current) { this.launchCommandRef.current.focus(); }
      event.preventDefault();
    }
  }

  onLocalKeyDown = (event: React.KeyboardEvent) => {
    // Save changes
    if (event.ctrlKey && event.key === 's' && // (CTRL + S ...
        this.props.isEditing && this.props.currentTag) { // ... while editing, and a game is selected)
      this.props.onSaveTag();
      event.preventDefault();
    }
  }

  onDescriptionChange = (event: React.ChangeEvent<InputElement>) => {
    this.props.onEditTag({ description: event.currentTarget.value });
  }

  onCurrentTagChange = (event: React.ChangeEvent<InputElement>) => {
    this.setState({ currentTagInput: event.currentTarget.value });
  }

  onCurrentTagMergeChange = (event: React.ChangeEvent<InputElement>) => {
    const newTag = event.currentTarget.value;
    let newSuggestions: TagSuggestion[] = this.state.tagMergeSuggestions;

    if (newTag !== '') {
      // Delayed set
      window.Shared.back.send<any, any>(BackIn.GET_TAG_SUGGESTIONS, newTag, (res) => {
        if (res.data) {
          this.setState({
            tagMergeSuggestions: res.data
          });
        }
      });
    } else {
      newSuggestions = [];
    }

    this.setState({
      currentTagMergeInput: newTag,
      tagMergeSuggestions: newSuggestions
    });
  }

  onMergeTag = (event: React.MouseEvent) => {
    if (this.props.currentTag) {
      this.props.onLockEdit(true);
      window.Shared.back.send<Tag, MergeTagData>(BackIn.MERGE_TAGS, {
        toMerge: this.props.currentTag,
        mergeInto: this.state.currentTagMergeInput,
        makeAlias: this.state.makeAliasWhenMerged
      }, (res) => {
        if (res.data && (!this.props.currentTag || res.data.id !== this.props.currentTag.id)) {
          this.props.onSetTag(res.data);
        }
        this.props.onLockEdit(false);
        this.setState({ currentTagMergeInput: '', makeAliasWhenMerged: false });
      });
    }
  }

  onSelectTagMergeSuggestion = (suggestion: TagSuggestion): void => {
    // Clear out suggestions box
    this.setState({
      tagMergeSuggestions: [],
      currentTagMergeInput: suggestion.primaryAlias
    });
  }

  onMakeAliasWhenMergedToggle = (checked: boolean): void => {
    this.setState({ makeAliasWhenMerged: checked });
  }

  /** When a key is pressed while an input field is selected (except for multiline fields) */
  onInputKeyDown = (event: React.KeyboardEvent): void => {
    // if (event.key === 'Enter') { this.props.onSaveGame(); }
  }

  onTagAliasSelect = (tagAlias: TagAlias, index: number): void => {
    if (!this.props.isLocked) {
      this.props.onEditTag({ primaryAlias: tagAlias, primaryAliasId: tagAlias.id });
    }
  }

  onRemoveTagAlias = (tagAlias: TagAlias, index: number): void => {
    if (this.props.currentTag) {
      const aliases = deepCopy(this.props.currentTag.aliases);
      const index = aliases.findIndex(ta => ta.id == tagAlias.id);
      if (index > -1) {
        aliases.splice(index, 1);
      }
      this.props.onEditTag({ aliases: aliases });
    }
  }

  onAddTagAliasByString = (text: string): void => {
    if (text !== '') {
      window.Shared.back.send<TagGetResponse, TagGetData>(BackIn.GET_TAG, text, (res) => {
        if (res.data) {
          // Tag alias exists
          remote.dialog.showErrorBox('Alias Error!',`Alias already exists on tag '${res.data.primaryAlias.name}'!`);
        } else if (this.props.currentTag && this.props.currentTag.id) {
          // Tag alias doesn't exist
          const newTagAlias = new TagAlias();
          newTagAlias.name = text;
          newTagAlias.tagId = this.props.currentTag.id;
          this.props.onEditTag({ aliases: [...this.props.currentTag.aliases, newTagAlias] });
        }
      });
    }
    // Clear out suggestions box
    this.setState({
      currentTagInput: ''
    });
  }

  onDeleteTagClick = (): void => {
    console.log('clalled');
    if (this.props.onDeleteTag) {
      this.props.onDeleteTag();
    }
  }

  onSelectCategory = (text: string, index: number) => {
    const selected = this.props.tagCategories[index];
    this.props.onEditTag({ categoryId: selected.id });
  }

  static contextType = LangContext;
}
