import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ITagAlias } from '@shared/back/types';
import { Platform } from './Platform';

@Entity()
export class PlatformAlias implements ITagAlias {
  @PrimaryGeneratedColumn()
  /** ID of the tag alias (unique identifier) */
    id: number;

  @Column({ nullable: true })
    platformId?: number;

  @ManyToOne(() => Platform, t => t.aliases)
    platform?: Platform;

  @Index()
  @Column({collation: 'NOCASE', unique: true})
  /** Alias */
    name: string;
}
