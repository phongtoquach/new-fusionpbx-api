import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GatewaysService, Gateway } from './gateways.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gateways')
@UseGuards(JwtAuthGuard)
export class GatewaysController {
  constructor(private readonly gatewaysService: GatewaysService) {}

  @Get()
  async findAll(@Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.gatewaysService.findAll(domain_uuid);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.gatewaysService.findOne(uuid, domain_uuid);
  }

  @Post()
  async create(@Body() gateway: Gateway, @Request() req) {
    gateway.domain_uuid = req.user.domain_uuid;
    return await this.gatewaysService.create(gateway);
  }

  @Put(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() gateway: Partial<Gateway>,
    @Request() req
  ) {
    const domain_uuid = req.user.domain_uuid;
    return await this.gatewaysService.update(uuid, domain_uuid, gateway);
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.gatewaysService.remove(uuid, domain_uuid);
  }
}
