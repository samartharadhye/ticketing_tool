import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ActivityController } from './activity.controller';
import { ActivityModule } from './activity.module';
import { ActivityService } from './activity.service';

describe('ActivityModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();
  });

  it('should compile the module and resolve ActivityController and ActivityService', () => {
    const controller = module.get<ActivityController>(ActivityController);
    const service = module.get<ActivityService>(ActivityService);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
