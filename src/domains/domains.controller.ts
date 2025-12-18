import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DomainsService, Domain } from './domains.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  async findAll() {
    return await this.domainsService.findAll();
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return await this.domainsService.findOne(uuid);
  }

  @Post()
  async create(@Body() domain: Domain) {
    return await this.domainsService.create(domain);
  }

  @Put(':uuid')
  async update(@Param('uuid') uuid: string, @Body() domain: Partial<Domain>) {
    return await this.domainsService.update(uuid, domain);
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string) {
    return await this.domainsService.remove(uuid);
  }
}
