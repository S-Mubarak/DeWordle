import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UserService } from 'src/user/user.service';
import { JwtPayloadDto } from '../dto/jwt-payload.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: Record<string, unknown>) {
    // SEC-1220: enforce the token payload schema before trusting it.
    // A valid signature is not enough — the payload must carry the
    // required user identification fields (sub, email, roles).
    const dto = plainToInstance(JwtPayloadDto, payload, {
      exposeDefaultValues: true,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length > 0) {
      throw new UnauthorizedException(
        'Invalid token payload: missing or malformed user identification fields',
      );
    }

    const user = await this.userService.findById(dto.sub);
    return user ?? null;
  }
}
