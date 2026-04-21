import { Controller, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '@app/utils/pagination';
import { PaginationQuery } from '@app/decorators/pagination.decorator';
import { AdminOnly } from '@app/decorators/roles.decorator';
import { CurrentUser } from '@app/decorators/current-user.decorator';
import { UserRole, type User } from '@app/generated/prisma/client';
import { ApiOkResponse } from '@app/decorators/swagger.decorator';
import { ResponseUserDto, ResponseUsersDto } from './dto/response-user.dto';
import { IgnoreCache } from '@app/decorators/cache.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({
    summary: 'Get me',
    response: ResponseUserDto,
  })
  getMe(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  @ApiOkResponse({
    summary: 'Update me',
    response: ResponseUserDto,
  })
  updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
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
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @ApiOkResponse({
    summary: 'Get user',
    response: ResponseUserDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    summary: 'Update user',
    response: ResponseUserDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    summary: 'Delete user',
    response: ResponseUserDto,
    roles: [UserRole.ADMIN],
  })
  @AdminOnly()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
