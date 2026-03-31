import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getHello(): string {
    return 'Backend is running';
  }

  @Get('api/health')
  getHealth() {
    return {
      status: 'ok',
      service: 'backend',
      version: this.configService.get<string>('APP_VERSION') || '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}