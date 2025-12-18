import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RingGroupsService, RingGroup } from './ring-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ring-groups')
@UseGuards(JwtAuthGuard)
export class RingGroupsController {
  constructor(private readonly ringGroupsService: RingGroupsService) {}

  @Get()
  async findAll(@Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.ringGroupsService.findAll(domain_uuid);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.ringGroupsService.findOne(uuid, domain_uuid);
  }

  @Post()
  async create(@Body() ringGroup: RingGroup, @Request() req) {
    //ringGroup.domain_uuid = req.user.domain_uuid;
    return await this.ringGroupsService.create(ringGroup);
  }

  @Put(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() ringGroup: Partial<RingGroup>,
    @Request() req
  ) {
    const domain_uuid = req.user.domain_uuid;
    return await this.ringGroupsService.update(uuid, domain_uuid, ringGroup);
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.ringGroupsService.remove(uuid, domain_uuid);
  }
}
