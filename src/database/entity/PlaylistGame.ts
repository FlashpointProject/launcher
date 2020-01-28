import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Game } from './Game';
import { Playlist } from './Playlist';

@Entity()
export class PlaylistGame {
  @PrimaryGeneratedColumn()
  id?: string;

  @Column()
  playlistId?: string;

  @ManyToOne(type => Playlist, p => p.games)
  playlist?: Playlist;

  @Column()
  /** Order priority of the game in the playlist */
  order: number;

  @Column()
  /** Notes for the game inside the playlist specifically */
  notes: string;

  @Column({ nullable: true })
  gameId?: string;

  @ManyToOne(type => Game)
  /** The game this represents */
  game?: Game;
}