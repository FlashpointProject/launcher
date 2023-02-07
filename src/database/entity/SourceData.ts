import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Source } from './Source';

@Index('IDX_sourcedata_sourceid', ['sourceId'])
@Index('IDX_sourcedata_hash', ['sha256'])
@Entity()
export class SourceData {
  @PrimaryGeneratedColumn()
    id: number;

  @ManyToOne(type => Source, source => source.data)
  /** Source providing the download */
    source: Source;

  @Column({ nullable: true })
    sourceId: number;

  @Column({collation: 'NOCASE'})
  /** SHA256 hash of this download */
    sha256: string;

  @Column()
    urlPath: string;

}
