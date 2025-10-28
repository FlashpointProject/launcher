/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { downloadGameData } from './download';
import { fpDatabase } from '.';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { DownloaderStatus, DownloadTask, DownloadTaskStatus, DownloadWorkerState, Game, GameDataSource } from 'flashpoint-launcher';
import { axios } from './dns';
import { BackState } from './types';
import { BackOut } from '@shared/back/types';
import { promiseSleep } from './util/misc';
import { WrappedEventEmitter } from './util/WrappedEventEmitter';
import { EventQueue } from './util/EventQueue';
import { AxiosError } from 'axios';
import { getGameDataFilename } from '@shared/utils/misc';

export interface Downloader {
  on  (event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;

  on(event: 'workerChange', handler: (workerState: DownloadWorkerState) => void): this;
  once(event: 'workerChange', handler: (workerState: DownloadWorkerState) => void): this;

  on(event: 'statusChange', listener: (status: DownloaderStatus) => void): this;
  once(event: 'statusChange', listener: (status: DownloaderStatus) => void): this;

  on(event: 'taskChange', listener: (task: DownloadTask) => void): this;
  once(event: 'taskChange', listener: (task: DownloadTask) => void): this;
  off(event: 'taskChange', listener: (task: DownloadTask) => void): this;
}

export class Downloader extends WrappedEventEmitter {
  private tasks: Record<string, DownloadTask> = {}; // Queue of tasks to be executed
  private workers: DownloadWorker[] = []; // Array of workers
  private idleWorkers: DownloadWorker[] = []; // Array of idle workers
  public databaseQueue: EventQueue = new EventQueue;
  public status: DownloaderStatus;

  constructor(
    public readonly flashpointPath: string,
    public readonly dataPacksFolderPath: string,
    public readonly imageFolderPath: string,
    public readonly onDemandBaseUrl: string,
    public readonly sources: GameDataSource[],
    public state: BackState,
    workerCount: number
  ) {
    super();
    log.debug('Downloads', `Starting downloader with ${workerCount} workers`);
    for (let i = 0; i < workerCount; i++) {
      const worker = new DownloadWorker(this, i + 1);
      this.workers.push(worker);
      this.idleWorkers.push(worker);
    }
    this.status = 'stopped';
  }

  public start() {
    if (this.status === 'stopped') {
      this.status = 'running';
      for (let i = 0; i < this.workers.length; i++) {
        const nextTask = this.getNextTask();
        if (nextTask) {
          this.assignTaskToIdleWorker(nextTask);
        }
      }
      this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_STATUS, this.status);
      this.emit('statusChange', this.status);
    }
  }

  public stop() {
    if (this.status === 'running') {
      this.status = 'stopped';
      // Abort all workers and reset them to the idle queue
      for (const worker of this.workers) {
        worker.abort();
      }
      this.idleWorkers = [...this.workers]; // Reset all workers to idle
      this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_STATUS, this.status);
      this.emit('statusChange', this.status);
    }
  }

  public async clear() {
    this.status = 'stopped';
    for (const worker of this.workers) {
      worker.abort();
    }
    await promiseSleep(1000);
    this.tasks = {};
    this.status = 'running';
    this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_WHOLE_STATE, {
      state: this.status,
      tasks: this.getTasks(),
      workers: this.getWorkerStates(),
    });
  }

  public getTotal(): number {
    return Object.values(this.tasks).length;
  }

  public getTasks(): Record<string, DownloadTask> {
    return this.tasks;
  }

  public getWorkerStates(): DownloadWorkerState[] {
    return this.workers.map(worker => worker.getState());
  }

  public addTasks(games: Game[]) {
    // Bulk send updates in sets of up to 2500
    let updateQueue: DownloadTask[] = [];
    for (const game of games) {
      if (!this.tasks[game.id]) {
        const newTask: DownloadTask = {
          status: 'waiting',
          game: {
            id: game.id,
            title: game.title,
          },
          errors: [],
        };
        updateQueue.push(newTask);
      }

      if (updateQueue.length >= 2500) {
        this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_TASKS, updateQueue);
        for (const task of updateQueue) {
          this.tasks[task.game.id] = task;
          this.assignTaskToIdleWorker(task);
          this.emit('taskChange', task);
        }
        updateQueue = [];
      }
    }

    if (updateQueue.length > 0) {
      this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_TASKS, updateQueue);
      for (const task of updateQueue) {
        this.tasks[task.game.id] = task;
        this.assignTaskToIdleWorker(task);
        this.emit('taskChange', task);
      }
    }
  }

  public addTask(game: Game): boolean {
    if (!this.tasks[game.id]) {
      const newTask: DownloadTask = {
        status: 'waiting',
        game: {
          id: game.id,
          title: game.title,
        },
        errors: [],
      };
      this.tasks[game.id] = newTask;
      this.assignTaskToIdleWorker(newTask);
      this.emit('taskChange', newTask);
      this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_TASK, newTask);
      return true;
    }
    return false;
  }

  public getNextTask(): DownloadTask | undefined {
    const nextTaskKey = Object.keys(this.tasks).find(key => this.tasks[key].status === 'waiting');
    if (nextTaskKey) {
      return this.tasks[nextTaskKey];
    }
  }

  private assignTaskToIdleWorker(task: DownloadTask): void {
    if (this.status === 'running' && this.idleWorkers.length > 0) {
      log.debug('Downloads', 'Starting task');
      const worker = this.idleWorkers.shift(); // Get the first idle worker
      if (worker) {
        task.errors = [];
        task.status = 'in_progress';
        this.emit('taskChange', task);
        this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_TASK, task);
        worker.assignTask(task);
      }
    }
  }

  // Mark the URL as successfully processed
  public signalStatus(worker: DownloadWorker, gameId: string, status: DownloadTaskStatus, errors: string[]): void {
    this.idleWorkers.push(worker);
    if (this.tasks[gameId]) {
      if (this.status === 'running') {
        this.tasks[gameId].status = status;
        this.tasks[gameId].errors = errors;
        log.info('Downloader', `Task: ${gameId} - Status: ${status}`);
        this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_TASK, this.tasks[gameId]);
        this.emit('taskChange', this.tasks[gameId]);
      } else {
        this.tasks[gameId].status = 'waiting';
        log.info('Downloader', `Task: ${gameId} - Status: waiting`);
        this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_TASK, this.tasks[gameId]);
        this.emit('taskChange', this.tasks[gameId]);
      }
    }

    if (status === 'failure' && this.status === 'running') {
      log.error('Downloader', `Download failure for ${gameId}: ${errors}`);
    }

    const nextTask = this.getNextTask();
    if (nextTask) {
      this.assignTaskToIdleWorker(nextTask);
    } else if (this.idleWorkers.length === this.workers.length) {
      // No tasks remaining, all workers idle, stop
      this.stop();
    }
  }

  public onWorkerUpdate(worker: DownloadWorker) {
    const state = worker.getState();
    this.state.socketServer.broadcast(BackOut.UPDATE_DOWNLOADER_STATE_WORKER, state);
    this.emit('workerChange', state);
  }
}

class DownloadWorker {
  private abortController: AbortController | null = null;
  private step = 1;
  private totalSteps = 3;
  private stepProgress = 0.0;
  private taskText = '';
  private statusText = '';

  constructor(
    private downloader: Downloader,
    private id: number,
  ) {}

  public getState(): DownloadWorkerState {
    return {
      id: this.id,
      step: this.step,
      totalSteps: this.totalSteps,
      stepProgress: this.stepProgress,
      taskText: this.taskText,
      text: this.statusText,
    };
  }

  // Start the worker to begin processing URLs
  public async assignTask(task: DownloadTask): Promise<void> {
    this.abortController = new AbortController(); // Create a new AbortController for the task
    const { signal } = this.abortController;
    await this.execute(signal, task);
  }

  private async execute(signal: AbortSignal, task: DownloadTask): Promise<void> {
    this.taskText = `Downloading '${task.game.title}'...`;
    this.step = 1;
    this.stepProgress = 0;
    this.statusText = 'Downloading logo...';
    this.downloader.onWorkerUpdate(this);
    const gameInfo = task.game;
    const gameId = gameInfo.id;
    const errors: string[] = [];

    const game = await fpDatabase.findGame(gameId);
    if (!game) {
      errors.push(`Failed to find game with id ${gameId}`);
      this.downloader.signalStatus(this, gameId, 'failure', errors);
      return;
    }

    // Download game images
    const logoPath = path.join(this.downloader.flashpointPath, this.downloader.imageFolderPath, game.logoPath);
    const ssPath = path.join(this.downloader.flashpointPath, this.downloader.imageFolderPath, game.screenshotPath);

    if (!fs.existsSync(logoPath)) {
      try {
        await this.downloadImage(game.logoPath, signal);
      } catch (e) {
        this.downloader.signalStatus(this, gameId, 'failure', errors);
        errors.push(`Failed downloading game logo: ${e}`);
      }
    }

    if (signal.aborted) {
      this.downloader.signalStatus(this, gameId, 'failure', errors);
      return;
    }

    this.downloader.onWorkerUpdate(this);
    this.statusText = 'Downloading screenshot...';
    this.step = 2;

    if (!fs.existsSync(ssPath)) {
      try {
        await this.downloadImage(game.screenshotPath, signal);
      } catch (e) {
        errors.push(`Failed downloading game screenshot: ${e}`);
      }
    }

    if (signal.aborted) {
      this.downloader.signalStatus(this, gameId, 'failure', errors);
      return;
    }

    this.downloader.onWorkerUpdate(this);
    this.statusText = 'Downloading game data...';
    this.step = 3;

    const foundGameData = await fpDatabase.findGameData(game.id);

    // Download game data
    if (foundGameData) {
      this.stepProgress = 0;
      for (const gameData of foundGameData) {
        // Calc the path on disk and check if the file already matches
        const realPath = path.join(this.downloader.flashpointPath, this.downloader.dataPacksFolderPath, getGameDataFilename(gameData));
        if (fs.existsSync(realPath)) {
          if (gameData.path !== realPath || gameData.presentOnDisk === false) {
            gameData.path = realPath;
            gameData.presentOnDisk = true;
            await new Promise<void>((resolve, reject) => {
              this.downloader.databaseQueue.push(async () => {
                try {
                  await fpDatabase.saveGameData({
                    id: gameData.id,
                    gameId: gameId,
                    path: realPath,
                    presentOnDisk: true,
                  });
                  await fpDatabase.saveGame({
                    id: gameId,
                    activeDataOnDisk: true
                  });
                  resolve();
                } catch (err) {
                  reject(err);
                }
              });
            });
          }
          continue;
        }

        // Did not find matching file, try and download
        try {
          await downloadGameData(gameData.id, this.downloader.state, signal, (progress) => {
            this.stepProgress = progress;
            this.downloader.onWorkerUpdate(this);
          }, () => {});
        } catch (e) {
          errors.push(`Failed downloading game data: ${e}`);
        }

        this.statusText = 'Done';
        this.stepProgress = 1;
        this.downloader.onWorkerUpdate(this);

        if (signal.aborted) {
          this.downloader.signalStatus(this, gameId, 'failure', errors);
          return;
        }
      }
    }

    if (errors.length > 0) {
      this.downloader.signalStatus(this, gameId, 'failure', errors);
    } else {
      this.downloader.signalStatus(this, gameId, 'success', errors);
    }
  }

  private async downloadImage(subPath: string, signal: AbortSignal) {
    const url = this.downloader.onDemandBaseUrl + (this.downloader.onDemandBaseUrl.endsWith('/') ? '' : '/') + subPath;
    await axios.get(url, { responseType: 'arraybuffer', signal })
    .then(async (res) => {
      // Save response to image file
      const imageData = res.data;

      const imageFolder = path.join(this.downloader.flashpointPath, this.downloader.imageFolderPath);
      const filePath = path.join(imageFolder, subPath);

      await fs.ensureDir(path.dirname(filePath));
      await fs.promises.writeFile(filePath, imageData, 'binary');
    })
    .catch((err: AxiosError) => {
      if (err.response?.status !== 404) {
        throw err;
      }
    });
  }

  // Abort the current task
  public abort(): void {
    if (this.abortController) {
      this.abortController.abort(); // Trigger the abort signal
    }
  }
}
