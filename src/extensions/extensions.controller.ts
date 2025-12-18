import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ExtensionsService, Extension } from './extensions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('extensions')
@UseGuards(JwtAuthGuard)
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @Get()
  async findAll(@Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.extensionsService.findAll(domain_uuid);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.extensionsService.findOne(uuid, domain_uuid);
  }

  @Post()
  async create(@Body() extension: Extension, @Request() req) {
    // Override domain_uuid from JWT
    //extension.domain_uuid = req.user.domain_uuid;
    return await this.extensionsService.create(extension);
  }

  @Put(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() extension: Partial<Extension>,
    @Request() req
  ) {
    const domain_uuid = req.user.domain_uuid;
    return await this.extensionsService.update(uuid, domain_uuid, extension);
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string, @Request() req) {
    const domain_uuid = req.user.domain_uuid;
    return await this.extensionsService.remove(uuid, domain_uuid);
  }
}
