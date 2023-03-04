import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ITagAlias } from '@shared/back/types';
import { Platform } from './Platform';

@Entity()
export class PlatformAlias implements ITagAlias {
  @PrimaryGeneratedColumn()
  /** ID of the tag alias (unique identifier) */
    id: number;

  @Column({ nullable: true })
    tagId?: number;

  @ManyToOne(() => Platform, t => t.aliases)
    tag?: Platform;

  @Index()
  @Column({collation: 'NOCASE', unique: true})
  /** Alias */
    name: string;
}
