import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Tag } from './Tag';

@Entity()
export class TagCategory {
  @PrimaryGeneratedColumn()
  /** ID of the tag category (unique identifier) */
  id: number;

  @Column({collation: 'NOCASE'})
  /** Category Name */
  name: string;

  @Column()
  /** Category Color */
  color: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(type => Tag, t => t.category)
  tags: Tag[];
}