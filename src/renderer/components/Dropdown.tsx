import { DropdownFrameProps, DropdownProps, DropdownRowProps } from 'flashpoint-launcher-renderer';
import React, { Activity, useEffect, useMemo, useRef, useState } from 'react';

// A text element, with a drop-down element that can be shown/hidden.
export function DropdownFrame({ children, form, text, className, headerClassName }: DropdownFrameProps) {
  // Hooks
  const [expanded, setExpanded] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onToggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Close dropdown when clicking outside of it
  const handleClickOutside = (event: any) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpanded(false);
    }
  };

  useEffect(() => {
    // Add event listener to handle clicks outside the dropdown
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const baseClass = form ? 'simple-dropdown-form' : 'simple-dropdown';

  // Render
  return (
    <div
      className={`${baseClass} ${className}`}
      onClick={onToggleExpanded}>
      <div
        className={`${baseClass}__select-box ${headerClassName}`}
        tabIndex={0}>
        <div className={`${baseClass}__select-text`}>
          {text}
        </div>
        <div className={`${baseClass}__select-icon`} />
      </div>
      <div
        className={`${baseClass}__content` + (expanded ? '' : ` ${baseClass}__content--hidden`)}
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}>
        <Activity mode={expanded ? 'visible' : 'hidden'}>
          {children}
        </Activity>
      </div>
    </div>
  );
}

// A text element, with a drop-down element that can be shown/hidden.
export function Dropdown<T>({ rowCount, rowRenderer: RowRenderer, rowProps, form, text, className, headerClassName }: DropdownProps<T>) {
  // Hooks
  const [expanded, setExpanded] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onToggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Close dropdown when clicking outside of it
  const handleClickOutside = (event: any) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpanded(false);
    }
  };

  useEffect(() => {
    // Add event listener to handle clicks outside the dropdown
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const baseClass = form ? 'simple-dropdown-form' : 'simple-dropdown';

  const rows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push(
        <RowRenderer key={i} index={i} {...rowProps} />
      );
    }
    return rows;
  }, [RowRenderer, rowCount, rowProps]);

  // Render
  return (
    <div
      className={`${baseClass} ${className}`}
      onClick={onToggleExpanded}>
      <div
        className={`${baseClass}__select-box ${headerClassName}`}
        tabIndex={0}>
        <div className={`${baseClass}__select-text`}>
          {text}
        </div>
        <div className={`${baseClass}__select-icon`} />
      </div>
      <div
        className={`${baseClass}__content` + (expanded ? '' : ` ${baseClass}__content--hidden`)}
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}>
        <Activity mode={expanded ? 'visible' : 'hidden'}>
          {rows}
        </Activity>
      </div>
    </div>
  );
}

export type DropdownCheckboxRowProps<T> = {
  labels: T[],
  labelRenderer?: (props: { label: T, index: number }) => React.JSX.Element;
  onToggle: (index: number) => void;
  isChecked: (index: number) => boolean;
}

export function DropdownCheckboxRow<T>({
  labels, labelRenderer: LabelRenderer, onToggle, isChecked, index
}: DropdownRowProps<DropdownCheckboxRowProps<T>>) {
  const label = labels[index];

  return (
    <label
      key={index}
      className='log-page__dropdown-item'>
      <div className='simple-center'>
        <input
          type='checkbox'
          checked={isChecked(index)}
          onChange={() => onToggle(index)}
          className='simple-center__vertical-inner' />
      </div>
      <div className='simple-center'>
        <p className='simple-center__vertical-inner log-page__dropdown-item-text'>
          {LabelRenderer ?
            <LabelRenderer label={label} index={index} /> :
            String(label)}
        </p>
      </div>
    </label>
  );
}
