import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Game } from './Game';

@Entity()
export class GameData {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Game, game => game.data)
  /** ID of the related game */
  game?: Game;

  @Column({ nullable: true })
  gameId: string;

  @Column({collation: 'NOCASE'})
  /** Title of this data pack */
  title: string;

  @Column({ type: 'datetime' })
  /** Date this data pack was added on */
  dateAdded: Date;

  @Column({collation: 'NOCASE'})
  /** Expected SHA256 hash of this data pack */
  sha256: string;

  @Column()
  /** Expected CRC32 of this data pack */
  crc32: number;

  @Column({ default: false })
  /** Is the data pack present on disk */
  presentOnDisk: boolean;

  @Column({ nullable: true })
  /** Path this data pack should reside at, if present on disk */
  path?: string;

  @Column()
  /** Size of this data pack */
  size: number;

  @Column({ nullable: true })
  /** Parameters passed to the mounter */
  parameters?: string;
}
