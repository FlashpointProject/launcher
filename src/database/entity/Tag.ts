import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne, ManyToMany, JoinTable, OneToOne } from 'typeorm';
import { TagAlias } from './TagAlias';
import { TagCategory } from './TagCategory';
import { Game } from './Game';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  /** ID of the tag (unique identifier) */
  id?: number;

  /** ID of Primary Alias */
  @Column({ nullable: true })
  primaryAliasId: number;

  /** Primary Alias */
  @OneToOne(type => TagAlias, t => t.tag, { cascade: true, eager: true, nullable: true })
  primaryAlias: TagAlias;

  /** Aliases / Names of the tag */
  @OneToMany(type => TagAlias, t => t.tag,  { cascade: true, eager: true })
  aliases: TagAlias[];

  @Column({ nullable: true })
  categoryId?: number;

  @ManyToOne(type => TagCategory)
  category?: TagCategory;

  @ManyToMany(type => Game, g => g.tags)
  gamesUsing?: Game[];
}