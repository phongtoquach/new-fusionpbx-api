import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FreeswitchService } from './freeswitch.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class ExecuteCommandDto {
  command: string;
}

class SofiaCommandDto {
  profile: string;
  command: string;
}

@Controller('freeswitch')
@UseGuards(JwtAuthGuard)
export class FreeswitchController {
  constructor(private readonly freeswitchService: FreeswitchService) {}

  @Post('reload')
  @HttpCode(HttpStatus.OK)
  async reloadXml() {
    const result = await this.freeswitchService.reloadXml();
    return {
      success: true,
      command: 'reloadxml',
      response: result,
    };
  }

  @Post('reload-acl')
  @HttpCode(HttpStatus.OK)
  async reloadAcl() {
    const result = await this.freeswitchService.reloadAcl();
    return {
      success: true,
      command: 'reloadacl',
      response: result,
    };
  }

  @Post('rescan')
  @HttpCode(HttpStatus.OK)
  async rescan() {
    const result = await this.freeswitchService.rescan();
    return {
      success: true,
      command: 'rescan',
      response: result,
    };
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  async status() {
    const result = await this.freeswitchService.status();
    return {
      success: true,
      command: 'status',
      response: result,
    };
  }

  @Post('command')
  @HttpCode(HttpStatus.OK)
  async executeCommand(@Body() dto: ExecuteCommandDto) {
    const result = await this.freeswitchService.executeCommand(dto.command);
    return {
      success: true,
      command: dto.command,
      response: result,
    };
  }

  @Post('sofia')
  @HttpCode(HttpStatus.OK)
  async sofiaCommand(@Body() dto: SofiaCommandDto) {
    const result = await this.freeswitchService.sofia(dto.profile, dto.command);
    return {
      success: true,
      command: `sofia ${dto.profile} ${dto.command}`,
      response: result,
    };
  }

  @Post('sofia/profile/restart')
  @HttpCode(HttpStatus.OK)
  async sofiaProfileRestart(@Body() body: { profile: string }) {
    const result = await this.freeswitchService.sofiaProfileRestart(body.profile);
    return {
      success: true,
      command: `sofia profile ${body.profile} restart`,
      response: result,
    };
  }

  @Post('gateway/reload')
  @HttpCode(HttpStatus.OK)
  async reloadGateway(@Body() body: { gateway: string }) {
    const result = await this.freeswitchService.reloadGateway(body.gateway);
    return {
      success: true,
      command: `killgw ${body.gateway}`,
      response: result,
    };
  }

  @Post('test-tool/test-xmlrpc')
  @HttpCode(HttpStatus.OK)
  async testXmlRpc(@Body() body: { gateway: string }) {
    const xmlrpc_obj = require('xmlrpc');

    const client = xmlrpc_obj.createClient({
      host: '192.168.1.134',
      port: 8080,
      path: '/xmlrpc',
      basic_auth: { user: 'admin', pass: 'Mật_khẩu_admin' }
    });
  }
}
