import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { LangContext } from '@renderer/util/lang';
import { BackIn, TagSuggestion } from '@shared/back/types';
import { TagFilterGroup } from '@shared/preferences/interfaces';
import { tagSort, generateTagFilterGroup } from '@shared/Util';
import * as React from 'react';
import { CheckBox } from './CheckBox';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { TagInputField } from './TagInputField';

export type TagFilterGroupEditorProps = {
  tagFilterGroup: TagFilterGroup;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  onChangeName: (name: string) => void;
  onToggleExtreme: (checked: boolean) => void;
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

  // const tags = React.useMemo(() => tagsFactory(props.tagFilterGroup.tags, props.onRemoveTag), [props.tagFilterGroup.tags, props.onRemoveTag]);
  // const categories = React.useMemo(() => categoriesFactory(props.tagFilterGroup.categories, props.onRemoveCategory), [props.tagFilterGroup.categories, props.onRemoveCategory]);

  React.useEffect(() => {
    /** Parse the tags into 'real tags' on first load */
    Promise.all(parsedTagsList.map(async (t) => {
      return (await window.Shared.back.request(BackIn.GET_TAG, t.primaryAlias.name)) || t;
    }))
    .then((parsedTags) => {
      setParsedTagsList(parsedTags);
    });
  }, []);

  const onAddTag = React.useCallback(async (name: string) => {
    const tag = await window.Shared.back.request(BackIn.GET_TAG, name) || buildPlaceholderTags([name])[0];
    const idx = parsedTagsList.findIndex(t => t.primaryAlias.name.toLowerCase() === tag.primaryAlias.name.toLowerCase());
    if (idx > -1) {
      /** Tag already exists, exit */
      return;
    }
    const newTagsList = [...parsedTagsList];
    newTagsList.push(tag);
    props.onAddTag(tag.primaryAlias.name);
    setParsedTagsList(newTagsList);
  }, [parsedTagsList, props.onAddTag]);

  const onRemoveTag = React.useCallback((tag: Tag) => {
    const newTagsList = [...parsedTagsList];
    const idx = newTagsList.findIndex(t => t.primaryAlias.name === tag.primaryAlias.name);
    if (idx > -1) {
      newTagsList.splice(idx, 1);
      setParsedTagsList(newTagsList);
    }
    props.onRemoveTag(tag.primaryAlias.name);
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
      const existingTagsList = parsedTagsList.filter(t => t.id ? t.id >= 0 : false).map(t => t.primaryAlias.name);
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
              onTagSuggestionSelect={(suggestion) => onTagSubmit(suggestion.primaryAlias)}
              onChange={(event) => updateSuggestions(event.target.value)}
              onTagSubmit={(tag) => onTagSubmit(tag)} />
          </div>
        </div>
      </div>
    );}, [parsedTagsList, editTag, tagSuggestions, props.tagCategories, onAddTag, onRemoveTag, onTagSubmit, updateSuggestions]);
}

function buildPlaceholderTags(tags: string[]): Tag[] {
  return tags.map(t => {
    const tag = new Tag();
    tag.primaryAlias = new TagAlias();
    tag.primaryAlias.name = t;
    tag.categoryId = -1;
    return tag;
  });
}
