import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Game } from './Game';

@Entity()
export class AdditionalApp {
  @PrimaryGeneratedColumn('uuid')
  /** ID of the additional application (unique identifier) */
  id: string;
  @Column()
  /** Path to the application that runs the additional application */
  applicationPath: string;
  @Column()
  /**
   * If the additional application should run before the game.
   * (If true, this will always run when the game is launched)
   * (If false, this will only run when specifically launched)
   */
  autoRunBefore: boolean;
  @Column()
  /** Command line argument(s) passed to the application to launch the game */
  launchCommand: string;
  @Column()
  /** Name of the additional application */
  @Column({collation: 'NOCASE'})
  name: string;
  @Column()
  /** Wait for this to exit before the Game will launch (if starting before launch) */
  waitForExit: boolean;
  @ManyToOne(type => Game, game => game.addApps)
  /** Parent of this add app */
  parentGame: Game;
}