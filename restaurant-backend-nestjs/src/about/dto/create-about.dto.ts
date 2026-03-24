import { IsString, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CoreValueDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class HowItWorksDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  icon: string;
}

export class CreateAboutDto {
  @IsString()
  @IsNotEmpty()
  sparkDescription: string;

  @IsString()
  @IsNotEmpty()
  solutionDescription: string;

  @IsString()
  @IsNotEmpty()
  missionDescription: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreValueDto)
  coreValues: CoreValueDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HowItWorksDto)
  howItWorks: HowItWorksDto[];
}
