import { LangContext } from '@renderer/util/lang';
import { MetaEditFlags } from '@shared/MetaEdit';
import { LangContainer } from '@shared/lang';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export type MetaEditExporterConfirmData = {
  id: string;
  properties: MetaEditFlags;
}

type MetaEditExporterProps = {
  /** ID of the game being exported. */
  gameId: string;
  /** Called when the user attempts to cancel/close the "popup". */
  onCancel: () => void;
  /** Called when the user attempts to confirm the export. */
  onConfirm: (data: MetaEditExporterConfirmData) => void;
}

export function MetaEditExporter(props: MetaEditExporterProps) {
  const strings = React.useContext(LangContext);
  const [properties, setProperties] = React.useState(initProperties);
  const portal = usePortal(document.body);

  const onClickBackground = React.useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      event.preventDefault();
      props.onCancel();
    }
  }, [props.onCancel]);

  const onClickConfirm = React.useCallback((event: React.MouseEvent) => {
    props.onConfirm({
      id: props.gameId,
      properties,
    });
  }, [props.onConfirm, props.gameId, properties]);

  // Render properties
  const keys = Object.keys(properties) as (keyof typeof properties)[];
  const propertiesElements = keys.map((key) => {
    const val = properties[key];
    return (
      <div
        key={key}
        className='meta-edit-exporter__row'
        onClick={() => setProperties({ ...properties, [key]: !val })}>
        <input
          type='checkbox'
          className='meta-edit-exporter__row-checkbox'
          readOnly={true}
          checked={val} />
        <p className='meta-edit-exporter__row-title'>{getGameString(key, strings)}</p>
      </div>
    );
  });

  // Render
  return ReactDOM.createPortal((
    <div
      className='meta-edit-exporter'
      onClick={onClickBackground}>
      <div
        className='meta-edit-exporter__outer simple-center'
        onClick={onClickBackground}>
        <div className='meta-edit-exporter__inner simple-scroll simple-center__inner simple-center__vertical-inner'>
          {/* Content */}
          <p className='meta-edit-exporter__title'>{strings.misc.exportMetaEditTitle}</p>
          <p>{strings.misc.exportMetaEditDesc}</p>
          <div className='meta-edit-exporter__rows'>
            {propertiesElements}
          </div>
          <input
            type='button'
            className='simple-button'
            value='Export'
            onClick={onClickConfirm} />
        </div>
      </div>
    </div>
  ), portal);
}

function initProperties(): MetaEditFlags {
  return {
    title: false,
    alternateTitles: false,
    series: false,
    developer: false,
    publisher: false,
    tags: false,
    platform: false,
    broken: false,
    extreme: false,
    playMode: false,
    status: false,
    notes: false,
    source: false,
    applicationPath: false,
    launchCommand: false,
    releaseDate: false,
    version: false,
    originalDescription: false,
    language: false,
    library: false,
  };
}

function getGameString(key: keyof MetaEditFlags, strings: LangContainer): string {
  // @TODO Put all the strings for the different properties/field of a Game into the
  //       same place, instead of having them spread out?
  switch (key) {
    default:                    return key;
    case 'title':               return strings.filter.title;
    case 'alternateTitles':     return strings.browse.alternateTitles;
    case 'series':              return strings.browse.series;
    case 'developer':           return strings.filter.developer;
    case 'publisher':           return strings.browse.publisher;
    case 'tags':                return strings.browse.tags;
    case 'platform':            return strings.browse.platform;
    case 'broken':              return strings.browse.brokenInInfinity;
    case 'extreme':             return strings.browse.extreme;
    case 'playMode':            return strings.browse.playMode;
    case 'status':              return strings.browse.status;
    case 'notes':               return strings.browse.notes;
    case 'source':              return strings.browse.source;
    case 'applicationPath':     return strings.browse.applicationPath;
    case 'launchCommand':       return strings.browse.launchCommand;
    case 'releaseDate':         return strings.browse.releaseDate;
    case 'version':             return strings.browse.version;
    case 'originalDescription': return strings.browse.originalDescription;
    case 'language':            return strings.browse.language;
    case 'library':             return strings.browse.library;
  }
}

function usePortal(parent: HTMLElement) {
  const element = React.useRef<HTMLDivElement | null>(null);

  if (!element.current) {
    element.current = document.createElement('div');
  }

  React.useEffect(() => {
    if (element.current) { parent.appendChild(element.current); }
    return () => {
      if (element.current) { element.current.remove(); }
    };
  });

  return element.current;
}
