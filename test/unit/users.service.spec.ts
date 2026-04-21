import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@app/modules/users/users.service';
import { UsersRepository } from '@app/modules/users/users.repository';
import { ICacheService } from '@app/interfaces/cache.interface';
import { CLERK_CLIENT } from '@app/modules/auth/clerk/clerk-client.provider';
import { User, UserRole } from '@app/generated/prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let clerkClient: { users: { deleteUser: jest.Mock } };

  const mockUser: User = {
    id: 'user-1',
    clerkId: 'clerk_1',
    email: 'test@test.com',
    name: 'Test User',
    phone: null,
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findByEmail: jest.fn(),
            findByClerkId: jest.fn(),
            syncClerkUser: jest.fn(),
            deleteByClerkId: jest.fn(),
          },
        },
        {
          provide: ICacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            wrap: jest
              .fn()
              .mockImplementation(
                async (
                  _key: string,
                  _ttl: number,
                  fetcher: () => Promise<unknown>,
                ) => fetcher(),
              ),
          },
        },
        {
          provide: CLERK_CLIENT,
          useValue: {
            users: {
              deleteUser: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(UsersRepository);
    cacheService = module.get(ICacheService);
    clerkClient = module.get(CLERK_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user', async () => {
      usersRepository.create.mockResolvedValue(mockUser);

      const result = await service.create({
        clerkId: 'clerk_1',
        email: 'test@test.com',
        name: 'Test User',
      });

      expect(result).toEqual(mockUser);
      expect(usersRepository.create).toHaveBeenCalledWith({
        clerkId: 'clerk_1',
        email: 'test@test.com',
        name: 'Test User',
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      usersRepository.findAll.mockResolvedValue([users, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(usersRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      usersRepository.findAll.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 5 });

      expect(usersRepository.findAll).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-1', { name: 'Updated Name' });

      expect(result).toEqual(updatedUser);
      expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
    });

    it('should throw NotFoundException if user to update not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user from clerk and database', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.delete.mockResolvedValue(mockUser);

      const result = await service.remove('user-1');

      expect(result).toEqual(mockUser);
      expect(clerkClient.users.deleteUser).toHaveBeenCalledWith('clerk_1');
      expect(usersRepository.delete).toHaveBeenCalledWith('user-1');
      expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
    });
  });

  describe('syncClerkUser', () => {
    it('should upsert user from clerk data', async () => {
      usersRepository.syncClerkUser.mockResolvedValue(mockUser);

      const result = await service.syncClerkUser({
        clerkId: 'clerk_1',
        email: 'test@test.com',
        name: 'Test User',
      });

      expect(result).toEqual(mockUser);
    });
  });

  describe('findByClerkId', () => {
    it('should find user by clerk id', async () => {
      usersRepository.findByClerkId.mockResolvedValue(mockUser);

      const result = await service.findByClerkId('clerk_1');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      usersRepository.findByClerkId.mockResolvedValue(null);

      const result = await service.findByClerkId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteByClerkId', () => {
    it('should delete user by clerk id', async () => {
      usersRepository.findByClerkId.mockResolvedValue(mockUser);
      usersRepository.deleteByClerkId.mockResolvedValue(mockUser);

      const result = await service.deleteByClerkId('clerk_1');

      expect(result).toEqual(mockUser);
      expect(usersRepository.deleteByClerkId).toHaveBeenCalledWith('clerk_1');
      expect(cacheService.del).toHaveBeenCalledWith('user:clerk:clerk_1');
    });

    it('should return null if user not found', async () => {
      usersRepository.findByClerkId.mockResolvedValue(null);

      const result = await service.deleteByClerkId('nonexistent');

      expect(result).toBeNull();
    });
  });
});
