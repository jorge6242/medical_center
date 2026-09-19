import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateLabOrderDto {
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsArray()
  @IsString({ each: true })
  labTestIds!: string[];
}
