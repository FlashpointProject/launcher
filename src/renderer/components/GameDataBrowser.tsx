import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { FloatingContainer } from './FloatingContainer';
import { GameDataInfo } from './GameDataInfo';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

export type GameDataBrowserState = {
  error?: string;
  dataFetched: boolean;
  gameData: GameData[];
}

export type GameDataBrowserProps = {
  game: Game;
  onClose: () => void;
  onUpdateActiveGameData: (activeDataOnDisk: boolean, activeDataId?: number) => void;
  onForceUpdateGameData: () => void;
}

export class GameDataBrowser extends React.Component<GameDataBrowserProps, GameDataBrowserState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  constructor(props: GameDataBrowserProps) {
    super(props);
    this.state = {
      dataFetched: false,
      gameData: []
    };
  }

  async componentDidMount() {
    /** Get all data packs */
    const gameData = await window.Shared.back.request(BackIn.GET_GAMES_GAME_DATA, this.props.game.id);
    this.setState({
      dataFetched: true,
      gameData
    });
  }

  componentWillUnmount() {
    window.Shared.back.request(BackIn.SAVE_GAME_DATAS, this.state.gameData);
  }

  onImportData = async () => {
    const strings = this.context;
    const path = window.Shared.showOpenDialogSync({
      message: strings.dialog.selectDataPackToImport,
      filters: [{ extensions: ['zip'], name: 'Data Pack'}]
    });
    if (path && path.length > 0) {
      // Send path to backend to import
      window.Shared.back.request(BackIn.IMPORT_GAME_DATA, this.props.game.id, path[0])
      .then(async (gameData) => {
        const existingIndex = this.state.gameData.findIndex(p => p.id === gameData.id);
        const newData = [...this.state.gameData];
        if (existingIndex === -1) {
          newData.push(gameData);
          this.props.onUpdateActiveGameData(gameData.presentOnDisk, gameData.id);
        } else {
          newData[existingIndex] = gameData;
        }
        this.setState({
          gameData: newData,
        });
      })
      .catch(err => {
        this.setState({
          error: err.toString(),
        });
      });
    }
  };

  onUpdateTitle = (index: number, title: string) => {
    const newData = [...this.state.gameData];
    newData[index].title = title;
    this.setState({ gameData: newData });
  };

  onUpdateParameters = (index: number, parameters: string) => {
    const newData = [...this.state.gameData];
    newData[index].parameters = parameters;
    this.setState({ gameData: newData });
  };

  updateGameData = async (id: number) => {
    const gameData = await window.Shared.back.request(BackIn.GET_GAME_DATA, id);
    if (gameData) {
      const newData = [...this.state.gameData];
      const idx = newData.findIndex(pd => pd.id === gameData.id);
      if (idx > -1) {
        newData[idx] = {...newData[idx], ...gameData, title: newData[idx].title };
        this.setState({ gameData: newData });
      }
    }
  };

  deleteGameData = async (id: number) => {
    await window.Shared.back.request(BackIn.DELETE_GAME_DATA, id);
    if (this.props.game.activeDataId === id) {
      this.props.onUpdateActiveGameData(false);
    }
    const newPairedData = [...this.state.gameData];
    const idx = newPairedData.findIndex(pr => pr.id === id);
    if (idx > -1) {
      newPairedData.splice(idx, 1);
      this.setState({ gameData: newPairedData });
    }
  };

  render() {
    const strings = this.context;

    const dataInfoMemo = memoizeOne(() => {
      return this.state.gameData.map((data, index) => {
        return (
          <GameDataInfo
            key={index}
            data={data}
            active={data.id === this.props.game.activeDataId}
            onUpdateTitle={(title) => this.onUpdateTitle(index, title)}
            onUpdateParameters={(parameters) => this.onUpdateParameters(index, parameters)}
            onActiveToggle={() => {
              this.props.onUpdateActiveGameData(data.presentOnDisk, data.id);
            }}
            onUninstall={() => {
              window.Shared.back.request(BackIn.UNINSTALL_GAME_DATA, data.id)
              .then(() => {
                const newDatas = [...this.state.gameData];
                newDatas[index].presentOnDisk = false;
                newDatas[index].path = undefined;
                this.setState({ gameData: newDatas });
                this.props.onForceUpdateGameData();
              })
              .catch(() => {
                alert(strings.dialog.unableToUninstallGameData);
              });
            }}
            update={async () => {
              await this.updateGameData(data.id);
              this.props.onForceUpdateGameData();
            }}
            delete={async () => {
              await this.deleteGameData(data.id)
              .catch(() => {
                alert(strings.dialog.unableToUninstallGameData);
              });
              this.props.onForceUpdateGameData();
            }}/>
        );
      });
    });

    return (
      <FloatingContainer>
        { this.state.dataFetched ? (
          <>
            <div className='game-data-browser__cross'
              onClick={this.props.onClose}>
              <OpenIcon icon='x'/>
            </div>
            <div className='game-data-browser__content'>
              {dataInfoMemo()}
              {this.state.gameData.length === 0 && (
                <i>No Game Data Found</i>
              )}
            </div>
            { this.state.error && (
              <div className='game-data-browser__error'>
                <b>IMPORT ERROR</b>
                <div>{this.state.error}</div>
              </div>
            )}
            <div className='game-data-browser__buttons'>
              <SimpleButton
                value='Import Data'
                onClick={this.onImportData} />
            </div>
          </>
        ) : (
          <i>FETCHING</i>
        )}
      </FloatingContainer>
    );
  }
}
