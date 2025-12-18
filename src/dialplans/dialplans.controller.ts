import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DialplansService, Dialplan } from './dialplans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dialplans')
@UseGuards(JwtAuthGuard)
export class DialplansController {
  constructor(private readonly dialplansService: DialplansService) {}

  @Get()
  async findAll(@Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.dialplansService.findAll(domain_uuid);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.dialplansService.findOne(uuid, domain_uuid);
  }

  @Post()
  async create(@Body() dialplan: Dialplan, @Request() req) {
    dialplan.domain_uuid = req.user.domain_uuid;
    return await this.dialplansService.create(dialplan);
  }

  @Put(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() dialplan: Partial<Dialplan>,
    @Request() req
  ) {
    const domain_uuid = req.user.domain_uuid;
    return await this.dialplansService.update(uuid, domain_uuid, dialplan);
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.dialplansService.remove(uuid, domain_uuid);
  }
}
