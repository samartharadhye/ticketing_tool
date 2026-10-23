import { Test, TestingModule } from '@nestjs/testing';
import { CommentsModule } from './comments.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CommentsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CommentsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();
  });

  it('should compile the module and resolve CommentsController and CommentsService', () => {
    const controller = module.get<CommentsController>(CommentsController);
    const service = module.get<CommentsService>(CommentsService);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
