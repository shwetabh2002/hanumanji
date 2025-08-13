import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from '../../app.controller';

describe('AppController', () => {
  let appController: AppController;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'app.name':
                  return 'Rapido Clone';
                case 'app.version':
                  return '1.0.0';
                case 'app.description':
                  return 'Ride-hailing app backend';
                case 'app.environment':
                  return 'test';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    configService = app.get<ConfigService>(ConfigService);
  });

  describe('getInfo', () => {
    it('should return app information', () => {
      const result = appController.getInfo();
      
      expect(result).toHaveProperty('name', 'Rapido Clone');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('description', 'Ride-hailing app backend');
      expect(result).toHaveProperty('environment', 'test');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment', 'test');
    });
  });
}); 