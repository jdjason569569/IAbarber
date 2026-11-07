import { BadRequestException, Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { RegisterDeviceUseCase } from '../../application/use-cases/register-device.use-case.js';
import { UnregisterDeviceUseCase } from '../../application/use-cases/unregister-device.use-case.js';
import { InvalidDeviceTokenError } from '../../domain/errors/invalid-device-token.error.js';
import type { RegisterDeviceRequest, UnregisterDeviceRequest } from './register-device.request.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly registerDevice: RegisterDeviceUseCase,
    private readonly unregisterDevice: UnregisterDeviceUseCase,
  ) {}

  /** The app sends its push token after login so the phone receives the workspace's notifications. */
  @Post('devices')
  @HttpCode(204)
  async register(@Body() body: RegisterDeviceRequest): Promise<void> {
    try {
      await this.registerDevice.execute({
        token: typeof body?.token === 'string' ? body.token : '',
        platform: typeof body?.platform === 'string' ? body.platform : 'android',
      });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** Called on logout: the phone stops receiving notifications. */
  @Delete('devices')
  @HttpCode(204)
  async unregister(@Body() body: UnregisterDeviceRequest): Promise<void> {
    try {
      await this.unregisterDevice.execute(typeof body?.token === 'string' ? body.token : '');
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

function toHttpError(error: unknown): unknown {
  if (error instanceof InvalidDeviceTokenError) return new BadRequestException(error.message);
  return error;
}
