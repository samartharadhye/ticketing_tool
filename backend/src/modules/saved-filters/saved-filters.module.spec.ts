import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { SavedFiltersController } from './saved-filters.controller';
import { SavedFiltersModule } from './saved-filters.module';
import { SavedFiltersService } from './saved-filters.service';

describe('SavedFiltersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SavedFiltersModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();
  });

  it('should compile the module and resolve SavedFiltersController and SavedFiltersService', () => {
    const controller = module.get<SavedFiltersController>(SavedFiltersController);
    const service = module.get<SavedFiltersService>(SavedFiltersService);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
