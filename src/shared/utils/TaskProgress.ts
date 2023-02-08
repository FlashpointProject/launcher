import { EventEmitter } from 'events';

interface ITaskProgress {
  on(event: 'done', listener: (text: string) => void): this;
  emit(event: 'done', text: string): boolean;
  on(event: 'progress', listener: (text: string, done: number) => void): this;
  emit(event: 'progress', text: string, done: number): boolean;

  setStage(stage: number, task: string): void;
  setStageProgress(done: number, task: string): void;
  done(stageTask: string): void;
}

export class TaskProgress extends EventEmitter implements ITaskProgress {
  private readonly _stageCount: number;
  private _stage: number;
  private _stageTask: string;
  private _stageProgressDone: number;
  private _stageProgressTask: string;
  private _done: boolean;

  constructor(stageCount?: number) {
    super();
    if (stageCount) {
      this._stageCount = stageCount;
    } else {
      this._stageCount = 1;
    }
    this._stage = 1;
    this._stageProgressDone = 0;
    this._stageTask = '...';
    this._stageProgressTask = '...';
    this._done = false;
  }

  setStage(stage: number, task: string) {
    if (!this._done) {
      if (stage > this._stageCount) {
        throw Error('Stage given exceeds Progress Stage Count');
      } else {
        console.log(`Set Stage: ${stage}`);
        this._stage = stage;
        this._stageTask = task;
        this._stageProgressDone = 0;
        this._stageProgressTask = '...';
        this._fireProgress();
      }
    }
  }

  setStageProgress(done: number, task: string) {
    if (!this._done) {
      console.log(`Stage progress: ${done.toFixed(4)}`);
      this._stageProgressDone = Math.min(done, 1);
      this._stageProgressTask = task;
      this._fireProgress();
    }
  }

  done(stageTask: string) {
    if (!this._done) {
      this._stageTask = stageTask;
      this._done = true;
      const progressText = `(FINISHED) ${this._stageTask}`;
      this.emit('done', progressText);
    }
  }

  _fireProgress() {
    const progressText = `(${this._stage}/${this._stageCount}) ${this._stageTask} (${this._stageProgressTask})`;
    const stageSize = (1 / this._stageCount);
    const progressPercent = ((this._stage - 1) * stageSize) + (stageSize * this._stageProgressDone);
    this.emit('progress', progressText, +(progressPercent.toFixed(4))); // + converts to number after toFixed converts to string
  }
}
