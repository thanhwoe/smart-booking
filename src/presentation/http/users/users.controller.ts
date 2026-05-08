import { Controller, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '@app/utils/pagination';
import { PaginationQuery } from '@presentation/decorators/pagination.decorator';
import { AdminOnly } from '@presentation/decorators/roles.decorator';
import { CurrentUser } from '@presentation/decorators/current-user.decorator';
import { UserRole, type User } from '@domain/user/user.entity';
import { ApiOkResponse } from '@presentation/decorators/swagger.decorator';
import { ResponseUserDto, ResponseUsersDto } from './dto/response-user.dto';
import { IgnoreCache } from '@presentation/decorators/cache.decorator';

import { FindUserUseCase } from '@application/user/use-cases/find-user.use-case';
import { UpdateUserUseCase } from '@application/user/use-cases/update-user.use-case';
import { DeleteUserUseCase } from '@application/user/use-cases/delete-user.use-case';
import { FindAllUsersUseCase } from '@app/application/user/use-cases/find-all-users.use-case';

@Controller('users')
export class UsersController {
  constructor(
    private readonly findUserUseCase: FindUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
  ) {}

  @Get('me')
  @ApiOkResponse({
    summary: 'Get me',
    response: ResponseUserDto,
  })
  getMe(@CurrentUser() user: User) {
    return this.findUserUseCase.findById(user.id);
  }

  @Patch('me')
  @ApiOkResponse({
    summary: 'Update me',
    response: ResponseUserDto,
  })
  updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.updateUserUseCase.execute(user.id, updateUserDto);
  }

  @Get()
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get all users',
    response: ResponseUsersDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  findAll(@PaginationQuery() pagination: PaginationDto) {
    return this.findAllUsersUseCase.execute(pagination);
  }

  @Get(':id')
  @ApiOkResponse({
    summary: 'Get user',
    response: ResponseUserDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  findOne(@Param('id') id: string) {
    return this.findUserUseCase.findById(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    summary: 'Update user',
    response: ResponseUserDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.updateUserUseCase.execute(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    summary: 'Delete user',
    response: ResponseUserDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  remove(@Param('id') id: string) {
    return this.deleteUserUseCase.execute(id);
  }
}
