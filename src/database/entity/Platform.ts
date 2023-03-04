import { ITagObject } from '@shared/back/types';
import { Column, Entity, JoinColumn, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Game } from './Game';
import { PlatformAlias } from './PlatformAlias';

@Entity()
export class Platform implements ITagObject {
  @PrimaryGeneratedColumn()
  /** ID of the tag (unique identifier) */
    id?: number;

  @UpdateDateColumn()
  /** Date when this tag was last modified */
    dateModified: string;

  /** ID of Primary Alias */
  @Column({ nullable: true })
    primaryAliasId: number;

  /** Primary Alias */
  @OneToOne(() => PlatformAlias, { cascade: true, eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
    primaryAlias: PlatformAlias;

  /** Aliases / Names of the tag */
  @OneToMany(() => PlatformAlias, t => t.tag,  { cascade: true, eager: true, onDelete: 'CASCADE' })
    aliases: PlatformAlias[];

  @Column({ nullable: true })
    description?: string;

  @ManyToMany(() => Game, g => g.tags)
    gamesUsing?: Game[];

  // Number of games this tag belongs to
  count?: number;
}
