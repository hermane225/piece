import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class PresenceBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  userIds!: string[];
}