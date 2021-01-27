import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SourceData } from './SourceData';

@Entity()
export class Source {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({collation: 'NOCASE'})
  /** Name of the Source */
  name: string;

  @Column()
  /** Base URL of the Source */
  url: string;

  @Column({ type: 'datetime' })
  /** When this Source was added */
  dateAdded: Date;

  @Column({ type: 'datetime' })
  /** Last time this Source was updated */
  lastUpdated: Date;

  @OneToMany(type => SourceData, data => data.source)
  /** Any data provided by this Source */
  data: SourceData[];

}
