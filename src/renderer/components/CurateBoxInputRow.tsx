import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { InputElement, InputField, InputFieldEntry } from '@renderer/components/InputField';
import { CurateActionType } from '@renderer/store/curate/enums';
import { CurateAction } from '@renderer/store/curate/types';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { CurationMeta } from '@shared/curate/types';
import { TagSuggestion } from 'flashpoint-launcher';
import * as React from 'react';
import { Dispatch } from 'redux';
import { DropdownInputField } from './DropdownInputField';
import { TagInputField } from './TagInputField';

export type CurateBoxInputRowProps = {
  title: string;
  text?: string;
  placeholder?: string;
  property: keyof CurationMeta;
  multiline?: boolean;
  curationFolder: string;
  disabled: boolean;
  warned: boolean;
  dispatch: Dispatch<CurateAction>;
}

export type CurateBoxInputEntryRowProps = {
  title: string;
  placeholder?: string;
  suggestions?: string[];
  multiline?: boolean;
  disabled: boolean;
  warned: boolean;
  onEnter: (value: string) => void;
}

export function CurateBoxInputEntryRow(props: CurateBoxInputEntryRowProps) {
  return (
    <CurateBoxRow title={props.title}>
      <InputFieldEntry
        className={props.warned ? 'input-field--warn' : ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        multiline={props.multiline}
        onEnter={props.onEnter}
        suggestions={props.suggestions}
        editable={true} />
    </CurateBoxRow>
  );
}

export function CurateBoxInputRow(props: CurateBoxInputRowProps) {
  const onChange = useOnInputChange(props.property, props.curationFolder, props.dispatch);

  return (
    <CurateBoxRow title={props.title}>
      <InputField
        className={props.warned ? 'input-field--warn' : ''}
        text={props.text || ''}
        placeholder={props.placeholder}
        onChange={onChange}
        disabled={props.disabled}
        multiline={props.multiline}
        editable={true} />
    </CurateBoxRow>
  );
}

export type DropdownItem = {
  key: string;
  value: string;
}

export type CurateBoxDropdownInputRowProps = CurateBoxInputRowProps & {
  className?: string;
  items: DropdownItem[];
}

export function CurateBoxDropdownInputRow(props: CurateBoxDropdownInputRowProps) {
  const { curationFolder, property, dispatch } = props;
  const onChange = React.useCallback((event: InputElementOnChangeEvent) => {
    const item = props.items.find(i => i.value === event.currentTarget.value);
    if (curationFolder !== undefined && item) {
      dispatch({
        type: CurateActionType.EDIT_CURATION_META,
        folder: curationFolder,
        property: property,
        value: item.key,
      });
    }
  }, [dispatch, curationFolder]);
  const onItemSelect = useTransformOnItemSelect(onChange);

  return (
    <CurateBoxRow title={props.title}>
      <DropdownInputField
        className={(props.className ? props.className + ' ' : '') + (props.warned ? 'input-field--warn' : '')}
        items={props.items.map(i => i.value) || []}
        onItemSelect={onItemSelect}
        text={props.text || ''}
        placeholder={props.placeholder}
        onChange={onChange}
        disabled={props.disabled}
        multiline={props.multiline}
        editable={true} />
    </CurateBoxRow>
  );
}

export type CurateBoxTagDropdownInputRowProps = CurateBoxInputRowProps & {
  className?: string;
  tagCategories: TagCategory[];
  tagSuggestions: TagSuggestion[];
  onAddTag: (tag: Tag) => void;
  onChange?: (event: React.ChangeEvent<InputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<InputElement>) => void;
}

export function CurateBoxTagDropdownInputRow(props: CurateBoxTagDropdownInputRowProps) {
  const strings = React.useContext(LangContext);

  const onSubmitTag = React.useCallback((text: string) => {
    const tags = text.split(';');
    tags.map(t => {
      window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, t.trim())
      .then((tag) => {
        if (tag) {
          props.onAddTag(tag);
        }
      });
    });
  }, [props.onAddTag]);

  const onTagSuggestionSelect = React.useCallback((sug: TagSuggestion) => {
    window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, sug.primaryAlias)
    .then((tag) => {
      if (tag) {
        props.onAddTag(tag);
      }
    });
  }, [props.onAddTag]);

  return (
    <CurateBoxRow title={props.title}>
      <TagInputField
        className={(props.className ? props.className + ' ' : '') + (props.warned ? 'input-field--warn' : '')}
        text={props.text || ''}
        tags={[]}
        suggestions={props.tagSuggestions}
        categories={props.tagCategories}
        placeholder={strings.browse.enterTag}
        onTagSubmit={onSubmitTag}
        onTagSuggestionSelect={onTagSuggestionSelect}
        onChange={props.onChange}
        editable={true} />
    </CurateBoxRow>
  );
}

/** Subset of the input elements on change event, with only the properties used by the callbacks. */
type InputElementOnChangeEvent = {
  currentTarget: {
    value: React.ChangeEvent<InputElement>['currentTarget']['value']
  }
}

function useOnInputChange(property: keyof CurationMeta, folder: string | undefined, dispatch: Dispatch<CurateAction>) {
  return React.useCallback((event: InputElementOnChangeEvent) => {
    if (folder !== undefined) {
      dispatch({
        type: CurateActionType.EDIT_CURATION_META,
        folder: folder,
        property: property,
        value: event.currentTarget.value,
      });
    }
  }, [dispatch, folder]);
}

function useTransformOnItemSelect(callback: (event: InputElementOnChangeEvent) => void) {
  return React.useCallback((text: string) => {
    callback({ currentTarget: { value: text } });
  }, [callback]);
}
