import {
  IsNumberString,
  IsString,
  MaxLength,
  MinLength,
  IsOptional, IsEmail, IsBooleanString,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  job_name: string;

  @IsBooleanString()
  useTest: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsNumberString()
  marker_name: string;

  @IsNumberString()
  chromosome: string;

  @IsNumberString()
  position: string;

  @IsNumberString()
  ncbi_build: number;
}
