import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { paginate, PaginationDto } from '@app/utils/pagination';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  create(createUserDto: CreateUserDto) {
    return this.usersRepository.create(createUserDto);
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.usersRepository.findAll({
      skip,
      take: limit,
    });

    return paginate(data, total, page, limit);
  }

  findOne(id: string) {
    return this.usersRepository.findById(id);
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  remove(id: string) {
    return this.usersRepository.delete(id);
  }

  syncClerkUser(data: CreateUserDto) {
    return this.usersRepository.syncClerkUser(data);
  }

  deleteByClerkId(clerkId: string) {
    return this.usersRepository.deleteByClerkId(clerkId);
  }

  async findByClerkId(clerkId: string) {
    return this.usersRepository.findByClerkId(clerkId);
  }
}
