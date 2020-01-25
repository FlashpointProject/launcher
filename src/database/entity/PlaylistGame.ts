import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Game } from './Game';

@Entity()
export class PlaylistGame {
  @PrimaryGeneratedColumn()
  id?: string;

  @Column()
  playlistId?: string;

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