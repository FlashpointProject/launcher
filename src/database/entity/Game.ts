import { BeforeUpdate, Column, Entity, Index, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdditionalApp } from './AdditionalApp';
import { GameData } from './GameData';
import { Platform } from './Platform';
import { Tag } from './Tag';
import { ArchiveState } from '@shared/back/types';

@Index('IDX_lookup_title',        ['library', 'title'])
@Index('IDX_lookup_dateAdded',    ['library', 'dateAdded'])
@Index('IDX_lookup_dateModified', ['library', 'dateModified'])
@Index('IDX_lookup_developer',    ['library', 'developer'])
@Index('IDX_lookup_publisher',    ['library', 'publisher'])
@Index('IDX_lookup_series',       ['library', 'series'])
@Index('IDX_total',               ['library', 'broken', 'extreme'])
@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  /** ID of the game (unique identifier) */
    id: string;

  @ManyToOne(() => Game)
    parentGame?: Game;

  @Column({ nullable: true })
    parentGameId?: string;

  @Column({collation: 'NOCASE'})
  @Index('IDX_gameTitle')
  /** Full title of the game */
    title: string;

  @Column({collation: 'NOCASE'})
  /** Any alternate titles to match against search */
    alternateTitles: string;

  @Column({collation: 'NOCASE'})
  /** Game series the game belongs to (empty string if none) */
    series: string;

  @Column({collation: 'NOCASE'})
  /** Name of the developer(s) of the game (developer names are separated by ',') */
    developer: string;

  @Column({collation: 'NOCASE'})
  /** Name of the publisher of the game */
    publisher: string;

  @Column({ type: 'datetime' })
  /** Date-time of when the game was added to collection */
    dateAdded: string;

  @UpdateDateColumn()
  /** Date-time of when the game was added to collection */
    dateModified: string;

  @ManyToMany(() => Platform, t => t.gamesUsing, { cascade: true, eager: true })
  @JoinTable()
    platforms: Platform[];

  @Column()
  /** If the game is "broken" or not */
    broken: boolean;

  @Column()
  /** Game is not suitable for children */
    extreme: boolean;

  @Column({collation: 'NOCASE'})
  /** If the game is single player or multiplayer, and if the multiplayer is cooperative or not */
    playMode: string;

  @Column({collation: 'NOCASE'})
  /** How playable the game is */
    status: string;

  @Column({collation: 'NOCASE'})
  /** Information that could be useful for the player (of varying importance) */
    notes: string;

  @ManyToMany(() => Tag, t => t.gamesUsing, { cascade: true, eager: true })
  @JoinTable()
  /** Tags of the game (separated by semi-colon) */
    tags: Tag[];

  @Column({collation: 'NOCASE', default: '' })
    tagsStr: string;

  @Column({collation: 'NOCASE', default: '' })
    platformsStr: string;

  @Column({collation: 'NOCASE'})
  /** Source if the game files, either full URL or the name of the website */
    source: string;

  @Column({ name: 'applicationPath' })
  /** LEGACY GAMES ONLY - Path to the application that runs the game */
    legacyApplicationPath: string;

  @Column({ name: 'launchCommand' })
  /** LEGACY GAMES ONLY - Command line argument(s) passed to the application to launch the game */
    legacyLaunchCommand: string;

  @Column({collation: 'NOCASE'})
  /** Date of when the game was released */
    releaseDate: string;

  @Column({collation: 'NOCASE'})
  /** Version of the game */
    version: string;

  @Column({collation: 'NOCASE'})
  /** Original description of the game (probably given by the game's creator or publisher) */
    originalDescription: string;

  @Column({collation: 'NOCASE'})
  /** The language(s) the game is in */
    language: string;

  @Column({collation: 'NOCASE'})
  /** Library this game belongs to */
    library: string;

  @Column({collation: 'NOCASE'})
  /** The title but reconstructed to be suitable for sorting and ordering (and not be shown visually) */
    orderTitle: string;

  @OneToMany(() => AdditionalApp, addApp => addApp.parentGame, {
    cascade: true,
    eager: true
  })
  /** All attached Additional Apps of a game */
    addApps: AdditionalApp[];

  /** If the game is a placeholder (and can therefore not be saved) */
  placeholder: boolean;

  /** ID of the primary platform */
  @Column()
    platformId: number;

  /** Cached name of the primary platform */
  @Column({collation: 'NOCASE'})
    platformName: string;

  /** ID of the active data */
  @Column({ nullable: true })
    activeDataId?: number;

  /** Whether the data is present on disk */
  @Column({ default: false })
    activeDataOnDisk: boolean;

  @OneToMany(() => GameData, datas => datas.game)
    data?: GameData[];

  /** Last Played Date */
  @Column({ type: 'datetime' })
    lastPlayed: string | null;

  /** Total Playtime (seconds) */
  @Column({ default: 0 })
    playtime: number;

  /** Number of plays */
  @Column({ default: 0 })
    playCounter: number;

  @Column({ default: ArchiveState.Available })
    archiveState: ArchiveState;

  @Column({ type: 'int', nullable: true })
    activeGameConfigId: number | null;

  @Column({ type: 'varchar', nullable: true })
    activeGameConfigOwner: string | null;

  // This doesn't run... sometimes.
  @BeforeUpdate()
  updateTagsStr() {
    // Tags
    try {
      this.tagsStr = this.tags.map(t => {
        if (t.primaryAlias) {
          return t.primaryAlias.name;
        } else {
          throw 'PrimaryAliases missing';
        }
      }).join('; ');
    } catch (err) {
      // Skip setting tagsStr if the entities tag info isn't loaded properly
    }

    // Platforms
    try {
      this.platformsStr = this.platforms.map(t => {
        if (t.primaryAlias) {
          return t.primaryAlias.name;
        } else {
          throw 'PrimaryAliases missing';
        }
      }).join('; ');
    } catch (err) {
      // Skip setting tagsStr if the entities tag info isn't loaded properly
    }
  }

}
