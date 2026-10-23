import { Module } from '@nestjs/common';

import { IssuesModule } from '../issues/issues.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SavedFiltersController } from './saved-filters.controller';
import { SavedFiltersService } from './saved-filters.service';

@Module({
  imports: [PrismaModule, IssuesModule],
  controllers: [SavedFiltersController],
  providers: [SavedFiltersService],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
