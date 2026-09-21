import { ApiProperty } from '@nestjs/swagger';
import { PushPlatform } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

const EXPO_TOKEN_REGEX = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export class UnregisterPushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_TOKEN_REGEX, { message: 'token Expo Push invalide' })
  token: string;
}

export class RegisterPushTokenDto extends UnregisterPushTokenDto {
  @ApiProperty({ enum: PushPlatform, example: 'ANDROID' })
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(PushPlatform)
  platform: PushPlatform;
}
