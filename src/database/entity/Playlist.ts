import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PlaylistGame } from './PlaylistGame';

@Entity()
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  /** ID of the playlist (unique identifier) */
  id: string;

  @OneToMany(type => PlaylistGame, pg => pg.playlist, {
    cascade: true
  })
  games: PlaylistGame[];

  @Column({collation: 'NOCASE'})
  /** Title of the playlist. */
  title: string;

  @Column({collation: 'NOCASE'})
  /** Description of the playlist. */
  description: string;

  @Column({collation: 'NOCASE'})
  /** Author of the playlist. */
  author: string;

  @Column({ nullable: true })
  /** Icon of the playlist (Base64 encoded image). */
  icon: string;

  @Column()
  /** Route of the library this playlist is for. */
  library: string;
}