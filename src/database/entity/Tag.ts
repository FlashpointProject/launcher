import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Game } from './Game';
import { TagAlias } from './TagAlias';
import { TagCategory } from './TagCategory';

@Entity()
export class Tag {
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
  @OneToOne(type => TagAlias, { cascade: true, eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  primaryAlias: TagAlias;

  /** Aliases / Names of the tag */
  @OneToMany(type => TagAlias, t => t.tag,  { cascade: true, eager: true, onDelete: 'CASCADE' })
  aliases: TagAlias[];

  @Column({ nullable: true })
  categoryId?: number;

  @ManyToOne(type => TagCategory)
  category?: TagCategory;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(type => Game, g => g.tags)
  gamesUsing?: Game[];

  // Number of games this tag belongs to
  count?: number;
}