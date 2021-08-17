import {
  IsNumberString,
  IsString,
  MaxLength,
  MinLength,
  IsBooleanString,
  IsBoolean,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  job_name: string;

  @IsNumberString()
  marker_name: string;

  @IsNumberString()
  chromosome: string;

  @IsNumberString()
  position: string;

  @IsNumberString()
  ncbi_build: number;
}
