import { IsArray, IsEmail, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SEC-1220: Canonical schema for JWT access-token payloads.
 *
 * JwtStrategy validates every presented token against this shape so that
 * a signature alone is not enough — tokens missing the required user
 * identification fields are rejected outright.
 */
export class JwtPayloadDto {
  @ApiProperty({ description: 'User id (subject)', example: 42, type: 'integer' })
  @IsNumber()
  sub: number;

  @ApiProperty({ description: 'User email', example: 'player@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Roles granted to the user',
    example: ['user'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  roles: string[];
}
