import { deepCopy } from '@shared/Util';
import { BackIn, FetchedGameInfo, MiddlewareVersionPair } from '@shared/back/types';
import * as Coerce from '@shared/utils/Coerce';
import { ConfigProp, ConfigSchema, Game, GameConfig, GameMiddlewareConfig, GameMiddlewareInfo } from 'flashpoint-launcher';
import * as React from 'react';
import { CheckBox } from './CheckBox';
import { ConfirmElement } from './ConfirmElement';
import { Dropdown } from './Dropdown';
import { FloatingContainer } from './FloatingContainer';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

const { str } = Coerce;

type GameConfigEdit = GameConfig & {
  schemas: Record<string, ConfigSchema>;
}

export type GameConfigDialogProps = {
  close: () => void;
  saveConfig: (config: GameConfig, idx: number) => Promise<void>;
  deleteConfig: (idx: number) => Promise<void>;
  makeTemplateConfig: (idx: number) => Promise<void>;
  duplicateConfig: (idx: number) => Promise<void>;
  info: FetchedGameInfo;
}

export function GameConfigDialog(props: GameConfigDialogProps) {
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [configCopy, setConfigCopy] = React.useState<GameConfigEdit>();
  const [copyIdx, setCopyIdx] = React.useState(0);
  const [validMiddleware, setValidMiddleware] = React.useState<GameMiddlewareInfo[]>([]);

  React.useEffect(() => {
    window.Shared.back.request(BackIn.GET_VALID_MIDDLEWARE, props.info.game)
    .then(setValidMiddleware);
  }, []);

  const openEditor = async (config: GameConfig, idx: number) => {
    // Populate config schemas
    const pairs = config.middleware.map(m => {
      const pair: MiddlewareVersionPair = {
        id: m.middlewareId,
        version: m.version
      };
      return pair;
    });
    const schemas = await window.Shared.back.request(BackIn.GET_MIDDLEWARE_CONFIG_SCHEMAS, props.info.game, pairs);
    const copy: GameConfigEdit = {
      ...deepCopy(config),
      schemas,
    };
    setConfigCopy(copy);
    setCopyIdx(idx);
    setEditorOpen(true);
  };

  const saveConfigCopy = async () => {
    if (configCopy) {
      await props.saveConfig(configCopy, copyIdx);
    }
    setEditorOpen(false);
  };

  const newConfig = React.useCallback(() => {
    const config: GameConfigEdit = {
      id: null,
      gameId: props.info.game.id,
      name: 'New Game Configuration',
      owner: 'local',
      middleware: [],
      schemas: []
    } as any as GameConfigEdit; // Hack to let ORM set ID

    setConfigCopy(config);
    setCopyIdx(props.info.configs.length);
    setEditorOpen(true);
  }, [props.info.configs.length, props.info.game.id]);

  // Generate rows
  const rows = React.useMemo(() => {
    return props.info.configs.map((c, idx) => {
      return (
        <div className='game-config-dialog__config' key={idx}>
          <div className='game-config-dialog__config-row'>
            <div className='game-config-dialog__config-left'>
              { c.gameId === 'template' && (
                <div className='game-config-dialog__config-title-prefix'>
                  {'(Template)'}
                </div>
              ) }
              <div className='game-config-dialog__config-title'>
                {c.name}
              </div>
            </div>
            <div className='game-config-dialog__config-right'>
              <div className='game-config-dialog__config-source-label'>
                {'Source:'}
              </div>
              <div className='game-config-dialog__config-source-value'>
                {c.owner}
              </div>
            </div>
          </div>
          <div className='game-config-dialog__config-row'>
            <div className='game-config-dialog__config-left'>
              <div className='game-config-dialog__config-middlewares'>
                <div className='game-config-dialog__config-middleware-label'>
                  {'Middleware:'}
                </div>
                {c.middleware.map((m, idx) => (
                  <div key={idx}>
                    {`${m.name} (version: ${m.version})`}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='game-config-dialog__config-row'>
            <div className='game-config-dialog__config-left'>
            </div>
            <div className='game-config-dialog__config-right game-config-dialog__config-buttons'>
              { c.gameId !== 'template' && (
                <SimpleButton
                  value='Make Template'
                  onClick={() => {
                    props.makeTemplateConfig(idx);
                  }}/>
              )}
              <ConfirmElement
                message={'Are you sure you want to delete this configuration?'}
                onConfirm={() => {
                  props.deleteConfig(idx);
                }}
                render={({ confirm }) => {
                  return (
                    <SimpleButton
                      onClick={() => { confirm(); }}
                      value='Delete'/>
                  );
                }} />
              { c.owner === 'local' && (
                <SimpleButton
                  value={'Modify'}
                  onClick={() => {
                    openEditor(c, idx);
                  }} />
              )}
              <SimpleButton
                value={'Make Copy'}
                onClick={() => {
                  props.duplicateConfig(idx);
                }} />
            </div>
          </div>
        </div>
      );
    });
  }, [props.info]);

  const buttonRow = React.useMemo(() => {
    return (
      <div className='game-config-dialog__config-buttons game-config-dialog__config-new'>
        <SimpleButton
          onClick={newConfig}
          value={'New Configuration'}/>
      </div>
    );
  }, [newConfig]);

  return (
    <FloatingContainer floatingClassName='game-config-dialog-container'>
      <div className='game-config-dialog'>
        {/** Editor Dialog */}
        { editorOpen && (
          <GameConfigEditorDialog
            game={props.info.game}
            validMiddleware={validMiddleware}
            config={configCopy as GameConfigEdit}
            setConfig={setConfigCopy}
            save={saveConfigCopy}
            discard={() => { setEditorOpen(false);}} />
        )}
        <div className='game-config-dialog-header'>
          <div className='game-config-dialog-header-title'>
            {`Game Configurations: ${props.info.game.title}`}
          </div>
          <div className='game-config-dialog-header-close' onClick={props.close}>
            <OpenIcon icon='x'/>
          </div>
        </div>
        <div className='game-config-dialog-content simple-scroll'>
          {rows}
        </div>
        <div className='game-config-dialog-footer'>
          {buttonRow}
        </div>
      </div>
    </FloatingContainer>
  );
}

type GameConfigEditorDialogProps = {
  game: Game;
  validMiddleware: GameMiddlewareInfo[];
  config: GameConfigEdit;
  setConfig: (config: GameConfigEdit) => void;
  save: () => void;
  discard: () => void;
};

function GameConfigEditorDialog(props: GameConfigEditorDialogProps) {
  const [versionEditorOpen, setVersionEditorOpen] = React.useState(false);
  const [versionEditorMiddlewareIdx, setVersionEditorMiddlewareIdx] = React.useState(0);

  const onSaveMiddlewareConfig = React.useCallback((idx: number, config: any) => {
    // Find middleware and apply config
    const newConfig = deepCopy(props.config);
    newConfig.middleware[idx].config = config;
    props.setConfig(newConfig);
  }, [props.config]);

  const addMiddleware = React.useCallback((middleware: GameMiddlewareInfo) => {
    window.Shared.back.request(BackIn.GET_MIDDLEWARE_DEFAULT_CONFIG, middleware.middlewareId, props.game)
    .then((newMiddlewareInfo) => {
      const newCopy: GameConfigEdit = {
        ...props.config,
        middleware: [
          ...props.config.middleware,
          newMiddlewareInfo.config,
        ]
      };
      newCopy.schemas[`${newMiddlewareInfo.config.middlewareId}-${newMiddlewareInfo.config.version}`] = newMiddlewareInfo.schema;
      props.setConfig(newCopy);
    });
  }, [props.config, props.game]);

  const deleteMiddleware = React.useCallback((idx: number) => {
    const newCopy: GameConfigEdit = {
      ...props.config,
      middleware: [
        ...props.config.middleware
      ]
    };
    newCopy.middleware.splice(idx, 1);
    props.setConfig(newCopy);
  }, [props.config]);

  const setConfigName = React.useCallback((event: React.ChangeEvent<InputElement>) => {
    const newCopy: GameConfigEdit = {
      ...props.config,
      name: event.currentTarget.value
    };
    props.setConfig(newCopy);
  }, [props.config]);

  const [selectedNewMiddleware, setSelectedNewMiddleware] = React.useState<GameMiddlewareInfo>();
  const newMiddlewareRow = React.useMemo(() => {
    const text = selectedNewMiddleware ? selectedNewMiddleware.name : 'Select Middleware';
    return (
      <div className='game-config-dialog__config-buttons game-config-dialog__config-row'>
        <Dropdown
          form={true}
          className={`browse-right-sidebar__game-config-dropdown ${selectedNewMiddleware !== undefined ? '' : 'browse-right-sidebar__game-config-dropdown-none'}`}
          text={text}>
          {props.validMiddleware.map((m, idx) => {
            return (
              <label
                className='curate-page__right-dropdown-content simple-dropdown-button'
                key={idx}
                onClick={() => {
                  setSelectedNewMiddleware(m);
                }}>
                <div>
                  {m.name}
                </div>
              </label>
            );
          })}
        </Dropdown>
        <SimpleButton
          onClick={() => {
            if (selectedNewMiddleware) {
              addMiddleware(selectedNewMiddleware);
            }
          }}
          value="Add Middleware"/>
      </div>
    );
  }, [props.validMiddleware, addMiddleware, selectedNewMiddleware]);

  const rows = React.useMemo(() => {
    return props.config.middleware.map((m, idx) => {
      const schemaId = `${m.middlewareId}-${m.version}`;
      const schema = schemaId in props.config.schemas ? props.config.schemas[schemaId] : null;
      return (
        <div key={idx}>
          <div className='game-config-dialog__config' key={idx}>
            <div className='game-config-dialog__config-row'>
              <div className='game-config-dialog__config-left'>
                <div className='game-config-dialog__config-title'>
                  {m.name}
                </div>
                <div className='game-config-dialog__config-version'>
                  {`(version: ${m.version})`}
                </div>
              </div>
              <div className='game-config-dialog__config-right'>
                <div className='game-config-dialog__config-buttons'>
                  <SimpleButton
                    onClick={() => {
                      deleteMiddleware(idx);
                    }}
                    value='Delete'/>
                  <SimpleButton
                    onClick={() => {
                      onOpenVersionEditor(idx);
                    }}
                    value='Set Version'/>
                </div>
                <div className='game-config-dialog__config-chevron-expansion'>
                  <OpenIcon icon='chevron-bottom'/>
                </div>
              </div>
            </div>
          </div>
          <div className='game-config-dialog-inputs'>
            {schema ?
              schema.map((inputProps) => {
                return renderMiddlewareInput(inputProps, m.config, (config) => {
                  onSaveMiddlewareConfig(idx, config);
                });
              })
              : ('Failed to load config schema')}
          </div>
        </div>
      );
    });
  }, [props.config.middleware, props.config.schemas]);

  const nameEditRow = (
    <div className='game-config-dialog__config-name-row'>
      <div className='game-config-dialog__config-name-label'>
        {'Name'}
      </div>
      <div className='game-config-dialog__config-name-input'>
        <InputField
          editable={true}
          onChange={setConfigName}
          text={props.config.name}
          className='input-field-form'/>
      </div>
    </div>
  );

  const onOpenVersionEditor = React.useCallback((idx: number) => {
    setVersionEditorMiddlewareIdx(idx);
    setVersionEditorOpen(true);
  }, [props.config.middleware]);

  const onSaveVersion = React.useCallback((version: string) => {
    const newConfig: GameConfigEdit = {
      ...props.config,
    };
    newConfig.middleware[versionEditorMiddlewareIdx].version = version;
    props.setConfig(newConfig);
    setVersionEditorOpen(false);
  }, [props.config.middleware, versionEditorMiddlewareIdx]);

  return versionEditorOpen ? (
    <GameConfigSetVersionDialog
      save={onSaveVersion}
      cancel={() => setVersionEditorOpen(false)}
      middleware={props.config.middleware[versionEditorMiddlewareIdx]} />
  ) : (
    <FloatingContainer floatingClassName='game-config-dialog-container'>
      <div className='game-config-dialog'>
        <div className='game-config-dialog-header'>
          <div className='game-config-dialog-header-title'>
            {'Game Configuration Editor'}
          </div>
          <div className='game-config-dialog-header-close' onClick={props.save}>
            <OpenIcon icon='check'/>
          </div>
          <div className='game-config-dialog-header-close' onClick={props.discard}>
            <OpenIcon icon='x'/>
          </div>
        </div>
        {nameEditRow}
        <div className='game-config-dialog-new-middleware'>
          {newMiddlewareRow}
        </div>
        <div className='game-config-dialog-content simple-scroll'>
          {rows}
        </div>
      </div>
    </FloatingContainer>
  );
}

function renderMiddlewareInput(inputProps: ConfigProp, config: any, saveConfig: (config: any) => void) {
  let input: JSX.Element = <></>;
  const value = inputProps.type !== 'label' ? (inputProps.key in config ? config[inputProps.key] :
    inputProps.default ? inputProps.default : null) : null;

  switch (inputProps.type) {
    case 'label': {
      input = (
        <div className='game-config-dialog-label-row'>
          <div className='game-config-dialog-label-title'>
            {inputProps.title}
          </div>
          { inputProps.description && (
            <div className='game-config-dialog-label-description'>
              {inputProps.description}
            </div>
          )}
        </div>
      );
      break;
    }
    case 'boolean': {
      input = (
        <div className='game-config-dialog-input-row'>
          <div className='game-config-dialog-input-title'>
            {inputProps.title}
          </div>
          { inputProps.description && (
            <div className='game-config-dialog-input-description'>
              {inputProps.description}
            </div>
          )}
          <div className='game-config-dialog-input-field'>
            <CheckBox
              onToggle={() => {
                saveConfig({
                  ...config,
                  [inputProps.key]: !value
                });
              }}
              checked={!!value}/>
          </div>
        </div>
      );
      break;
    }
    case 'number': {
      const inputRow = inputProps.options ?
        <Dropdown
          form={true}
          text={value}>
          {inputProps.options.map((option, idx) => {
            return (
              <label
                className='curate-page__right-dropdown-content simple-dropdown-button'
                key={idx}
                onClick={() => {
                  saveConfig({
                    ...config,
                    [inputProps.key]: option
                  });
                }}>
                <div>
                  {option}
                </div>
              </label>
            );
          })}
        </Dropdown>
        : (
          <InputField
            className='input-field-form'
            onChange={(event) => {
              // Cast value to number
              let saveValue: any = event.currentTarget.value;
              if (saveValue == '' && inputProps.optional) {
                saveValue = null;
              } else if (saveValue != '') {
                // Coerce to number object
                saveValue = (saveValue as any) * 1;
                if (isNaN(saveValue)) {
                  // Contains string characters, reject
                  return;
                }
              } else {
                saveValue = 0;
              }
              saveConfig({
                ...config,
                [inputProps.key]: saveValue
              });
            }}
            editable={true}
            text={value != null ? str(value || 0) : ''}/>
        );

      input = (
        <div className='game-config-dialog-input-row'>
          <div className='game-config-dialog-input-title'>
            {inputProps.title}
          </div>
          { inputProps.description && (
            <div className='game-config-dialog-input-description'>
              {inputProps.description}
            </div>
          )}
          <div className='game-config-dialog-input-field'>
            {inputRow}
          </div>
        </div>
      );
      break;
    }
    case 'string': {
      const inputRow = inputProps.options ?
        <Dropdown
          form={true}
          text={value}>
          {inputProps.options.map((option, idx) => {
            return (
              <label
                className='curate-page__right-dropdown-content simple-dropdown-button'
                key={idx}
                onClick={() => {
                  saveConfig({
                    ...config,
                    [inputProps.key]: option
                  });
                }}>
                <div>
                  {option}
                </div>
              </label>
            );
          })}
        </Dropdown>
        : (
          <InputField
            className='input-field-form'
            onChange={(event) => {
              let saveValue: any = event.currentTarget.value;
              if (saveValue == '' && inputProps.optional) {
                saveValue = null;
              }
              saveConfig({
                ...config,
                [inputProps.key]: event.currentTarget.value
              });
            }}
            editable={true}
            text={value || ''}/>
        );

      input = (
        <div className='game-config-dialog-input-row'>
          <div className='game-config-dialog-input-title'>
            {inputProps.title}
          </div>
          { inputProps.description && (
            <div className='game-config-dialog-input-description'>
              {inputProps.description}
            </div>
          )}
          <div className='game-config-dialog-input-field'>
            {inputRow}
          </div>
        </div>
      );
      break;
    }
  }

  return input;
}

type GameConfigSetVersionDialogProps = {
  middleware: GameMiddlewareConfig;
  save: (version: string) => void;
  cancel: () => void;
};

function GameConfigSetVersionDialog(props: GameConfigSetVersionDialogProps) {
  const [valid, setValid] = React.useState(true);
  const [version, setVersion] = React.useState(props.middleware.version);

  const onSave = React.useCallback(() => {
    if (valid) {
      props.save(version);
    }
  }, [valid, version]);

  const onSetVersion = async (event: React.ChangeEvent<InputElement>) => {
    const newVersion = event.target.value;
    // Check if the new version is valid
    const v = await window.Shared.back.request(BackIn.CHECK_MIDDLEWARE_VERSION_VALIDITY, props.middleware.middlewareId, newVersion);
    setValid(v);
    setVersion(newVersion);
  };

  // @TODO allow options for input
  return (
    <FloatingContainer>
      <div className='game-config-dialog__set-version'>
        <InputField
          className='input-field-large-text'
          form={true}
          editable={true}
          onChange={onSetVersion}
          text={version} />
        <div className='game-config-dialog__config-buttons'>
          <SimpleButton
            disabled={!valid}
            onClick={onSave}
            value='Save'/>
          <SimpleButton
            onClick={props.cancel}
            value='Cancel'/>
        </div>
      </div>

    </FloatingContainer>
  );
}
