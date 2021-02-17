import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { SourceData } from '@database/entity/SourceData';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { FloatingContainer } from './FloatingContainer';
import { GameDataInfo } from './GameDataInfo';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

class GameDataPaired extends GameData {
  sourceData: SourceData[]

  constructor(gData: GameData, sourceData: SourceData[]) {
    super();
    Object.assign(this, gData);
    this.sourceData = sourceData;
  }
}

export type GameDataBrowserState = {
  error?: string;
  dataFetched: boolean;
  pairedData: GameDataPaired[];
}

export type GameDataBrowserProps = {
  game: Game;
  onClose: () => void;
  onEditGame: (game: Partial<Game>) => void;
  onUpdateActiveGameData: (activeDataOnDisk: boolean, activeDataId?: number) => void;
  onForceUpdateGameData: () => void;
}

export interface GameDataBrowser {
  context: LangContainer;
}

export class GameDataBrowser extends React.Component<GameDataBrowserProps, GameDataBrowserState> {

  constructor(props: GameDataBrowserProps) {
    super(props);
    this.state = {
      dataFetched: false,
      pairedData: []
    };
  }

  async componentDidMount() {
    /** Get all data packs */
    const gameData = await window.Shared.back.request(BackIn.GET_GAMES_GAME_DATA, this.props.game.id);
    const sourceData = await window.Shared.back.request(BackIn.GET_SOURCE_DATA, gameData.map(gData => gData.sha256));
    const pairedData = gameData.map(gData => new GameDataPaired(gData, sourceData.filter(s => s.sha256 === gData.sha256)));
    this.setState({
      dataFetched: true,
      pairedData
    });
  }

  componentWillUnmount() {
    window.Shared.back.request(BackIn.SAVE_GAME_DATAS, this.state.pairedData);
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
        const existingIndex = this.state.pairedData.findIndex(p => p.id === gameData.id);
        const newData = [...this.state.pairedData];
        if (existingIndex === -1) {
          const sourceData = await window.Shared.back.request(BackIn.GET_SOURCE_DATA, [gameData.sha256]);
          newData.push(new GameDataPaired(gameData, sourceData));
          this.props.onUpdateActiveGameData(gameData.presentOnDisk, gameData.id);
        } else {
          newData[existingIndex] = new GameDataPaired(gameData, newData[existingIndex].sourceData);
        }
        this.setState({
          pairedData: newData,
        });
      })
      .catch(err => {
        this.setState({
          error: err.toString(),
        });
      });
    }
  }

  onUpdateTitle = (index: number, title: string) => {
    const newData = [...this.state.pairedData];
    newData[index].title = title;
    this.setState({ pairedData: newData });
  }

  updateGameData = async (id: number) => {
    const gameData = await window.Shared.back.request(BackIn.GET_GAME_DATA, id);
    if (gameData) {
      const newData = [...this.state.pairedData];
      const idx = newData.findIndex(pd => pd.id === gameData.id);
      if (idx > -1) {
        newData[idx] = {...newData[idx], ...gameData, title: newData[idx].title };
        this.setState({ pairedData: newData });
      }
    }
  }

  deleteGameData = async (id: number) => {
    await window.Shared.back.request(BackIn.DELETE_GAME_DATA, id);
    if (this.props.game.activeDataId === id) {
      this.props.onUpdateActiveGameData(false);
    }
    const newPairedData = [...this.state.pairedData];
    const idx = newPairedData.findIndex(pr => pr.id === id);
    if (idx > -1) {
      newPairedData.splice(idx, 1);
      this.setState({ pairedData: newPairedData });
    }
  }

  render() {
    const strings = this.context;

    const dataInfoMemo = memoizeOne((data) => {
      return this.state.pairedData.map((data, index) => {
        return (
          <GameDataInfo
            key={index}
            data={data}
            sourceData={data.sourceData}
            active={data.id === this.props.game.activeDataId}
            onUpdateTitle={(title) => this.onUpdateTitle(index, title)}
            onActiveToggle={() => {
              this.props.onUpdateActiveGameData(data.presentOnDisk, data.id);
            }}
            onUninstall={() => {
              window.Shared.back.request(BackIn.UNINSTALL_GAME_DATA, data.id)
              .then((game) => {
                const newDatas = [...this.state.pairedData];
                newDatas[index].presentOnDisk = false;
                newDatas[index].path = undefined;
                this.setState({ pairedData: newDatas });
                this.props.onForceUpdateGameData();
              })
              .catch((error) => {
                alert(strings.dialog.unableToUninstallGameData);
              });
            }}
            update={async () => {
              await this.updateGameData(data.id);
              this.props.onForceUpdateGameData();
            }}
            delete={async () => {
              await this.deleteGameData(data.id)
              .catch((error) => {
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
              {dataInfoMemo(this.state.pairedData)}
              {this.state.pairedData.length === 0 && (
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

  static contextType = LangContext;
}
