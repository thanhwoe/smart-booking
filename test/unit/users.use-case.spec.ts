import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserUseCase } from '@application/user/use-cases/create-user.use-case';
import { FindUserUseCase } from '@application/user/use-cases/find-user.use-case';
import { FindAllUsersUseCase } from '@application/user/use-cases/find-all-users.use-case';
import { UpdateUserUseCase } from '@application/user/use-cases/update-user.use-case';
import { DeleteUserUseCase } from '@application/user/use-cases/delete-user.use-case';
import { IUserRepository } from '@domain/user/user.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { IIdentityProvider } from '@application/user/ports/identity.port';
import type { User } from '@domain/user/user.entity';
import { UserRole } from '@domain/user/user.entity';
import { NotFoundException } from '@nestjs/common';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

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

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findByEmail: jest.fn(),
    findByClerkId: jest.fn(),
    syncClerkUser: jest.fn(),
    deleteByClerkId: jest.fn(),
  };
}

function makeCacheService(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    wrap: jest
      .fn()
      .mockImplementation(
        (_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
          fetcher(),
      ),
  };
}

function makeIdentityProvider(): jest.Mocked<IIdentityProvider> {
  return {
    deleteUser: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── CreateUserUseCase ────────────────────────────────────────────────────────

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    userRepo = makeUserRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: IUserRepository, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get(CreateUserUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a user', async () => {
    userRepo.create.mockResolvedValue(mockUser);

    const result = await useCase.execute({
      clerkId: 'clerk_1',
      email: 'test@test.com',
      name: 'Test User',
    });

    expect(result).toEqual(mockUser);
    expect(userRepo.create).toHaveBeenCalledWith({
      clerkId: 'clerk_1',
      email: 'test@test.com',
      name: 'Test User',
    });
  });
});

// ─── FindUserUseCase ──────────────────────────────────────────────────────────

describe('FindUserUseCase', () => {
  let useCase: FindUserUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let cacheService: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    userRepo = makeUserRepo();
    cacheService = makeCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserUseCase,
        { provide: IUserRepository, useValue: userRepo },
        { provide: ICacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = module.get(FindUserUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return a user by id', async () => {
    userRepo.findById.mockResolvedValue(mockUser);

    const result = await useCase.findById('user-1');

    expect(result).toEqual(mockUser);
  });

  it('should throw NotFoundException if user not found by id', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.findById('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return user by clerk id', async () => {
    userRepo.findByClerkId.mockResolvedValue(mockUser);

    const result = await useCase.findByClerkId('clerk_1');

    expect(result).toEqual(mockUser);
  });

  it('should return null if clerk user not found', async () => {
    userRepo.findByClerkId.mockResolvedValue(null);

    const result = await useCase.findByClerkId('nonexistent');

    expect(result).toBeNull();
  });
});

// ─── FindAllUsersUseCase ──────────────────────────────────────────────────────

describe('FindAllUsersUseCase', () => {
  let useCase: FindAllUsersUseCase;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    userRepo = makeUserRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllUsersUseCase,
        { provide: IUserRepository, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get(FindAllUsersUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return paginated users', async () => {
    userRepo.findAll.mockResolvedValue([[mockUser], 1]);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.data).toEqual([mockUser]);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('should calculate correct skip for page 2', async () => {
    userRepo.findAll.mockResolvedValue([[], 0]);

    await useCase.execute({ page: 2, limit: 5 });

    expect(userRepo.findAll).toHaveBeenCalledWith({ skip: 5, take: 5 });
  });
});

// ─── UpdateUserUseCase ────────────────────────────────────────────────────────

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let findUserUseCase: jest.Mocked<FindUserUseCase>;

  beforeEach(async () => {
    userRepo = makeUserRepo();
    cacheService = makeCacheService();
    findUserUseCase = { findById: jest.fn(), findByClerkId: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        { provide: IUserRepository, useValue: userRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindUserUseCase, useValue: findUserUseCase },
      ],
    }).compile();

    useCase = module.get(UpdateUserUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should update a user and invalidate cache', async () => {
    const updatedUser = { ...mockUser, name: 'Updated Name' };
    findUserUseCase.findById.mockResolvedValue(mockUser);
    userRepo.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('user-1', { name: 'Updated Name' });

    expect(result).toEqual(updatedUser);
    expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
  });

  it('should throw NotFoundException if user to update does not exist', async () => {
    findUserUseCase.findById.mockRejectedValue(new NotFoundException());

    await expect(
      useCase.execute('nonexistent', { name: 'Updated' }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── DeleteUserUseCase ────────────────────────────────────────────────────────

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let identityProvider: jest.Mocked<IIdentityProvider>;
  let findUserUseCase: jest.Mocked<FindUserUseCase>;

  beforeEach(async () => {
    userRepo = makeUserRepo();
    cacheService = makeCacheService();
    identityProvider = makeIdentityProvider();
    findUserUseCase = { findById: jest.fn(), findByClerkId: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: IUserRepository, useValue: userRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: IIdentityProvider, useValue: identityProvider },
        { provide: FindUserUseCase, useValue: findUserUseCase },
      ],
    }).compile();

    useCase = module.get(DeleteUserUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should delete user from identity provider and repository', async () => {
    findUserUseCase.findById.mockResolvedValue(mockUser);
    userRepo.delete.mockResolvedValue(mockUser);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(mockUser);
    expect(identityProvider.deleteUser).toHaveBeenCalledWith('clerk_1');
    expect(userRepo.delete).toHaveBeenCalledWith('user-1');
    expect(cacheService.del).toHaveBeenCalledWith('user:user-1');
    expect(cacheService.del).toHaveBeenCalledWith('user:clerk:clerk_1');
  });

  it('should delete user by clerk id and invalidate cache', async () => {
    findUserUseCase.findByClerkId.mockResolvedValue(mockUser);
    userRepo.deleteByClerkId.mockResolvedValue(mockUser);

    const result = await useCase.deleteByClerkId('clerk_1');

    expect(result).toEqual(mockUser);
    expect(userRepo.deleteByClerkId).toHaveBeenCalledWith('clerk_1');
    expect(cacheService.del).toHaveBeenCalledWith('user:clerk:clerk_1');
  });

  it('should return null if user by clerk id not found', async () => {
    findUserUseCase.findByClerkId.mockResolvedValue(null);

    const result = await useCase.deleteByClerkId('nonexistent');

    expect(result).toBeNull();
    expect(userRepo.deleteByClerkId).not.toHaveBeenCalled();
  });
});
