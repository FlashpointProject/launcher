import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdditionalApp } from './AdditionalApp';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  /** ID of the game (unique identifier) */
  id: string;

  @Column()
  /** Full title of the game */
  title: string;

  @Column()
  /** Any alternate titles to match against search */
  alternateTitles: string;

  @Column()
  /** Game series the game belongs to (empty string if none) */
  series: string;

  @Column()
  /** Name of the developer(s) of the game (developer names are separated by ',') */
  developer: string;

  @Column()
  /** Name of the publisher of the game */
  publisher: string;

  @CreateDateColumn()
  /** Date-time of when the game was added to collection */
  dateAdded: string;

  @UpdateDateColumn()
  /** Date-time of when the game was added to collection */
  dateModified: string;

  @Column()
  /** Platform the game runs on (Flash, HTML5, Shockwave etc.) */
  platform: string;

  @Column()
  /** If the game is "broken" or not */
  broken: boolean;

  @Column()
  /** Game is not suitable for children */
  extreme: boolean;

  @Column()
  /** If the game is single player or multiplayer, and if the multiplayer is cooperative or not */
  playMode: string;

  @Column()
  /** How playable the game is */
  status: string;

  @Column()
  /** Information that could be useful for the player (of varying importance) */
  notes: string;

  @Column()
  /** Tags of the game (seperated by semi-colon) */
  tags: string;

  @Column()
  /** Source if the game files, either full URL or the name of the website */
  source: string;

  @Column()
  /** Path to the application that runs the game */
  applicationPath: string;

  @Column()
  /** Command line argument(s) passed to the application to launch the game */
  launchCommand: string;

  @Column()
  /** Date of when the game was released */
  releaseDate: string;

  @Column()
  /** Version of the game */
  version: string;

  @Column()
  /** Original description of the game (probably given by the game's creator or publisher) */
  originalDescription: string;

  @Column()
  /** The language(s) the game is in */
  language: string;

  @Column()
  /** Library this game belongs to */
  library: string;

  @Column()
  /** The title but reconstructed to be suitable for sorting and ordering (and not be shown visually) */
  orderTitle: string;

  @OneToMany(type => AdditionalApp, addApp => addApp.parentGame, {
    eager: true,
    cascade: true
  })
  /** All attached Additional Apps of a game */
  addApps: AdditionalApp[];

  /** If the game is a placeholder (and can therefore not be saved) */
  placeholder: boolean;
}