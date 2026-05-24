import { CurateBoxRow } from '@renderer/components/CurateBoxRow';
import { InputField, InputFieldEntry } from '@renderer/components/InputField';
import { useAppDispatch } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { editCurationMeta } from '@renderer/store/curate/slice';
import { CurationMeta } from '@shared/curate/types';
import { Tag, TagCategory, TagSuggestion } from 'flashpoint-launcher';
import { InputElement } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { Dispatch } from 'redux';
import { DropdownInputField } from './DropdownInputField';
import { TagInputField } from './TagInputField';

// TODO: Figure out why these type members are reading as unused props
/* eslint-disable react/no-unused-prop-types */
export type CurateBoxInputRowProps = {
  title: string;
  text?: string;
  placeholder?: string;
  property: keyof CurationMeta;
  multiline?: boolean;
  curationFolder: string;
  disabled: boolean;
  warned: boolean;
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
  const dispatch = useAppDispatch();
  const onChange = useOnInputChange(props.property, props.curationFolder, dispatch);

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
  allowNonMatching?: boolean;
  className?: string;
  items: DropdownItem[];
}

export function CurateBoxDropdownInputRow(props: CurateBoxDropdownInputRowProps) {
  const dispatch = useAppDispatch();
  const { curationFolder, property } = props;
  const onChange = (event: InputElementOnChangeEvent) => {
    const item = props.items.find(i => i.value === event.currentTarget.value);
    if (curationFolder !== undefined && (item || props.allowNonMatching)) {
      dispatch(editCurationMeta({
        folder: curationFolder,
        property,
        value: item ? item.key : event.currentTarget.value,
      }));
    }
  };
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
  getTagFromName: (tagName: string) => Promise<Tag | null>;
  renderIconSugg?: (sugg: TagSuggestion) => React.JSX.Element;
}

export function CurateBoxTagDropdownInputRow(props: CurateBoxTagDropdownInputRowProps) {
  const strings = useLocalization();

  const onSubmitTag = (text: string) => {
    const tags = text.split(';');
    tags.map(t => {
      props.getTagFromName(t)
      .then((tag) => {
        if (tag) {
          props.onAddTag(tag);
        }
      });
    });
  };

  const onTagSuggestionSelect = (sug: TagSuggestion) => {
    props.getTagFromName(sug.name)
    .then((tag) => {
      if (tag) {
        props.onAddTag(tag);
      }
    });
  };

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
        renderIconSugg={props.renderIconSugg}
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

function useOnInputChange(property: keyof CurationMeta, folder: string | undefined, dispatch: Dispatch) {
  return (event: InputElementOnChangeEvent) => {
    if (folder !== undefined) {
      dispatch(editCurationMeta({
        folder,
        property,
        value: event.currentTarget.value,
      }));
    }
  };
}

function useTransformOnItemSelect(callback: (event: InputElementOnChangeEvent) => void) {
  return React.useCallback((text: string) => {
    callback({ currentTarget: { value: text } });
  }, [callback]);
}
