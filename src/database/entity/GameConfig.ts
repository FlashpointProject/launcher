import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('game_config')
export class RawGameConfig {
  @PrimaryGeneratedColumn()
  /** ID of the config */
    id: number;

  @Column()
  /** Game ID this config is for */
    gameId: string;

  @Column({ nullable: false })
  /** Name to display in launcher */
    name: string;

  @Column({ nullable: false })
  /** Who last modified this config (e.g local, remote - name) */
    owner: string;

  @Column('json')
  /** Middleware list, whether they're enabled, and associated configs */
    storedMiddleware: string;
}
