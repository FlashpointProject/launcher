import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { Tag } from './Tag';

@Entity()
export class TagAlias {
  @PrimaryGeneratedColumn()
  /** ID of the tag alias (unique identifier) */
  id: number;

  @Column({ nullable: true })
  tagId?: number;

  @ManyToOne(type => Tag, t => t.aliases)
  tag?: Tag;

  @Index()
  @Column({collation: 'NOCASE', unique: true})
  /** Alias */
  name: string;
}