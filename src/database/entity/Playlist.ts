import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PlaylistGame } from './PlaylistGame';

@Entity()
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  /** ID of the playlist (unique identifier) */
  id: string;

  @OneToMany(type => PlaylistGame, playlist => playlist.playlistId)
  games: PlaylistGame[];

  @Column()
  /** Title of the playlist. */
  title: string;

  @Column()
  /** Description of the playlist. */
  description: string;

  @Column()
  /** Author of the playlist. */
  author: string;

  @Column({ nullable: true })
  /** Icon of the playlist (Base64 encoded image). */
  icon: string;

  @Column()
  /** Route of the library this playlist is for. */
  library: string;
}