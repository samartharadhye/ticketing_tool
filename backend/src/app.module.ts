import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './common/strategies/jwt.strategy';
import { ActivityModule } from './modules/activity/activity.module';
import { CommentsModule } from './modules/comments/comments.module';
import { IssuesModule } from './modules/issues/issues.module';
import { SavedFiltersModule } from './modules/saved-filters/saved-filters.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    ActivityModule,
    CommentsModule,
    IssuesModule,
    SavedFiltersModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
