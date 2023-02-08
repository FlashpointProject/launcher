import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Game } from './Game';
import { Playlist } from './Playlist';

@Index('IDX_lookup_playlist_playlistId', ['playlistId'])
@Index('IDX_lookup_playlist_gameId', ['gameId'])
@Entity()
export class PlaylistGame {
  @PrimaryGeneratedColumn()
    id?: string;

  @Column()
    playlistId?: string;

  @ManyToOne(() => Playlist, p => p.games)
    playlist?: Playlist;

  @Column()
  /** Order priority of the game in the playlist */
    order: number;

  @Column()
  /** Notes for the game inside the playlist specifically */
    notes: string;

  @Column({ nullable: true })
    gameId?: string;

  @ManyToOne(() => Game)
  /** The game this represents */
    game?: Game;
}
