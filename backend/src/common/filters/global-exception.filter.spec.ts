import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function createMockHost(url: string): {
  host: any;
  response: any;
  request: any;
} {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const request = { url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };
  return { host, response, request };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('should format HttpException into { statusCode, message, error, timestamp, path }', () => {
    const { host, response, request } = createMockHost('/api/v1/users/1');

    filter.catch(new NotFoundException('User 1 not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'User 1 not found',
        error: 'Not Found',
        path: request.url,
      }),
    );

    const body = response.json.mock.calls[0][0];
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('path');
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('should join array messages into a single string', () => {
    const { host, response } = createMockHost('/api/v1/auth/register');

    filter.catch(
      new BadRequestException(['email must be an email', 'password too short']),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('email must be an email, password too short');
    expect(body.error).toBe('Bad Request');
  });

  it('should default unknown exceptions to 500', () => {
    const { host, response } = createMockHost('/api/v1/words');

    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('boom');
  });

  it('should preserve the status code and error name for UnauthorizedException', () => {
    const { host, response } = createMockHost('/api/v1/users/profile');

    filter.catch(new UnauthorizedException('Invalid token'), host);

    expect(response.status).toHaveBeenCalledWith(401);
    const body = response.json.mock.calls[0][0];
    expect(body.statusCode).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe('Invalid token');
  });
});
