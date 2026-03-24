import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('about_content')
export class About {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  sparkDescription: string;

  @Column('text')
  solutionDescription: string;

  @Column('text')
  missionDescription: string;

  @Column('json')
  coreValues: any;

  @Column('json')
  howItWorks: any;
}
