import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BrainService } from './brain.service';
import { UpsertBrainConfigDto } from './dto/brain-config.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ApiResponse } from '../../common/dto/api-response.dto';

@ApiTags('brain')
@Controller('brain')
export class BrainController {
  constructor(private readonly brainService: BrainService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @ApiOperation({ summary: 'List all brain section prompts for this org' })
  async listAll(@CurrentUser() user: AuthenticatedUser) {
    const configs = await this.brainService.listAll(user);
    return new ApiResponse(configs, 'Brain configs loaded');
  }

  @Get(':section')
  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @ApiOperation({ summary: 'Get brain config for a specific section' })
  async getSection(@Param('section') section: string, @CurrentUser() user: AuthenticatedUser) {
    const config = await this.brainService.getSection(user, section);
    return new ApiResponse(config ?? { section, label: section, prompt: '' }, '');
  }

  @Put(':section')
  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @ApiOperation({ summary: 'Create or update the super prompt for a section' })
  async upsert(
    @Param('section') section: string,
    @Body() dto: UpsertBrainConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const config = await this.brainService.upsert(user, section, dto);
    return new ApiResponse(config, 'Brain config saved');
  }
}
