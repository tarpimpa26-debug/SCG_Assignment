import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Backend is running';
  }

  @Get('api/health')
  getHealth() {
    return {
      status: 'ok',
      service: 'backend',
    };
  }
}