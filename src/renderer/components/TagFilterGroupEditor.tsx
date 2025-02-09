import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { generateTagFilterGroup, tagSort } from '@shared/Util';
import { Tag, TagCategory, TagFilterGroup, TagSuggestion } from 'flashpoint-launcher';
import * as React from 'react';
import { CheckBox } from './CheckBox';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { TagInputField } from './TagInputField';
import { SimpleButton } from './SimpleButton';
import { formatString } from '@shared/utils/StringFormatter';

export type TagFilterGroupEditorProps = {
  tagFilterGroup: TagFilterGroup;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  onChangeName: (name: string) => void;
  onChangeDescription: (description: string) => void;
  onToggleExtreme: (checked: boolean) => void;
  onChangeIconBase64: (iconBase64: string) => void;
  closeEditor: () => void;
  showExtreme: boolean;
  tagCategories: TagCategory[];
  activeTagFilterGroups: TagFilterGroup[];
}

export function TagFilterGroupEditor(props: TagFilterGroupEditorProps) {
  const strings = React.useContext(LangContext);
  const [editTag, setEditTag] = React.useState('');
  // const [editCategory, setEditCategory] = React.useState('');
  const [tagSuggestions, setTagSuggestions] = React.useState<TagSuggestion[]>([]);
  const [parsedTagsList, setParsedTagsList] = React.useState<Tag[]>(buildPlaceholderTags(props.tagFilterGroup.tags));

  var imgTagFilterIconInput: HTMLInputElement;

  // const tags = React.useMemo(() => tagsFactory(props.tagFilterGroup.tags, props.onRemoveTag), [props.tagFilterGroup.tags, props.onRemoveTag]);
  // const categories = React.useMemo(() => categoriesFactory(props.tagFilterGroup.categories, props.onRemoveCategory), [props.tagFilterGroup.categories, props.onRemoveCategory]);

  React.useEffect(() => {
    /** Parse the tags into 'real tags' on first load */
    Promise.all(parsedTagsList.map(async (t) => {
      return (await window.Shared.back.request(BackIn.GET_TAG, t.name)) || t;
    }))
    .then((parsedTags) => {
      setParsedTagsList(parsedTags);
    });
  }, []);

  const onAddTag = React.useCallback(async (name: string) => {
    const tag = await window.Shared.back.request(BackIn.GET_TAG, name) || buildPlaceholderTags([name])[0];
    const idx = parsedTagsList.findIndex(t => t.name.toLowerCase() === tag.name.toLowerCase());
    if (idx > -1) {
      /** Tag already exists, exit */
      return;
    }
    const newTagsList = [...parsedTagsList];
    newTagsList.push(tag);
    props.onAddTag(tag.name);
    setParsedTagsList(newTagsList);
  }, [parsedTagsList, props.onAddTag]);

  const onRemoveTag = React.useCallback((tag: Tag) => {
    const newTagsList = [...parsedTagsList];
    const idx = newTagsList.findIndex(t => t.name === tag.name);
    if (idx > -1) {
      newTagsList.splice(idx, 1);
      setParsedTagsList(newTagsList);
    }
    props.onRemoveTag(tag.name);
  }, [parsedTagsList, props.onRemoveTag]);

  const onTagSubmit = React.useCallback((tag: string) => {
    onAddTag(tag);
    setTagSuggestions([]);
    setEditTag('');
  }, [onAddTag, props.onAddTag]);

  const updateSuggestions = React.useCallback(async (tag: string) => {
    setEditTag(tag);
    if (tag === '') {
      setTagSuggestions([]);
    } else {
      const existingTagsList = parsedTagsList.filter(t => t.id ? t.id >= 0 : false).map(t => t.name);
      const suggs = await window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, tag, props.activeTagFilterGroups.concat([generateTagFilterGroup(existingTagsList)]));
      setTagSuggestions(suggs);
    }
  }, [parsedTagsList]);

  return React.useMemo(() => {
    return (
      <div className='tag-filter-editor__wrapper'>
        <div className='tag-filter-editor__buttons'>
          <div
            className='browse-right-sidebar__title-row__buttons__save-button'
            title={strings.config.saveAndClose}
            onClick={props.closeEditor}>
            <OpenIcon icon='check' />
          </div>
        </div>
        <div className='tag-filter-editor__header'>
          {strings.config.tagFilterGroupEditor}
        </div>
        { props.showExtreme && (
          <>
            <div className='tag-filter-editor__content-header'>
              {strings.browse.extreme}
            </div>
            <CheckBox
              onToggle={props.onToggleExtreme}
              checked={props.tagFilterGroup.extreme} />
          </>
        )}
        <div className='tag-filter-editor__content-header'>
          {strings.tags.name}
        </div>
        <InputField
          editable={true}
          onChange={(event) => props.onChangeName(event.target.value)}
          text={props.tagFilterGroup.name}/>
        <div className='tag-filter-editor__content-header'>
          {strings.tags.description}
        </div>
        <InputField
          editable={true}
          onChange={(event) => props.onChangeDescription(event.target.value)}
          text={props.tagFilterGroup.description}/>
        <div className='tag-filter-editor__content'>
          <div className='tag-filter-editor__content-section'>
            <div className='tag-filter-editor__content-header'>
              {strings.browse.tags}
            </div>
            <TagInputField
              tags={parsedTagsList.sort(tagSort)}
              editable={true}
              text={editTag}
              suggestions={tagSuggestions}
              categories={props.tagCategories}
              onTagEditableSelect={(tag) => onRemoveTag(tag)}
              onTagSuggestionSelect={(suggestion) => onTagSubmit(suggestion.name)}
              onChange={(event) => updateSuggestions(event.target.value)}
              onTagSubmit={(tag) => onTagSubmit(tag)} />
          </div>
        </div>
        <div className='tag-filter-editor__content-header'>
          {strings.tags.filterIcon}
        </div>
        <div className='tag-filter-editor__icon'>
          {
            props.tagFilterGroup.iconBase64 ? (
              <>
                <div
                  className='config-page__tfg-extreme-logo'
                  title={strings.browse.tagFilterIcon}
                  style={{ backgroundImage: `url("${props.tagFilterGroup.iconBase64}")` }} />
                <SimpleButton
                value={formatString(strings.misc.removeBlank, strings.browse.thumbnail)}
                onClick={() => props.onChangeIconBase64('')} />
              </>
            ) : (
              <SimpleButton
              value={formatString(strings.misc.addBlank, strings.browse.thumbnail)}
              onClick={() => imgTagFilterIconInput && imgTagFilterIconInput.click()} />
            )
          }
          <input
            hidden={true}
            ref={(ref) => imgTagFilterIconInput = (ref as HTMLInputElement)}
            accept='image/png'
            onChange={(event) => {
              let reader = new FileReader();
              reader.readAsDataURL(event.target.files![0]);
              reader.onload = () => {
                props.onChangeIconBase64(reader.result?.toString()!)};
                event.target.value = '';
            }}
            type='file'/>
        </div>

      </div>
    );}, [parsedTagsList, editTag, tagSuggestions, props.tagCategories, onAddTag, onRemoveTag, onTagSubmit, updateSuggestions]);
}

function buildPlaceholderTags(tags: string[]): Tag[] {
  return tags.map(t => {
    const tag: Tag = {
      id: -1,
      name: t,
      aliases: [],
      description: '',
      dateModified: new Date().toISOString(),
      category: 'default',
    };
    return tag;
  });
}
