import { UserRole } from '@app/generated/prisma/enums';
import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

interface IOptions {
  summary: string;
  description?: string;
  tag?: string;
  body?: Type<unknown> | string;
  response?: Type<unknown> | string;
  params?: Type<unknown>;
  errors?: HttpStatus[];
  roles?: UserRole[];
}

export const ERROR_DECORATORS = {
  [HttpStatus.BAD_REQUEST]: () =>
    ApiBadRequestResponse({ description: 'Validation failed' }),
  [HttpStatus.UNAUTHORIZED]: () =>
    ApiUnauthorizedResponse({ description: 'Invalid or missing token' }),
  [HttpStatus.FORBIDDEN]: () =>
    ApiForbiddenResponse({ description: 'Insufficient permissions' }),
  [HttpStatus.NOT_FOUND]: () =>
    ApiNotFoundResponse({ description: 'Resource not found' }),
  [HttpStatus.CONFLICT]: () =>
    ApiConflictResponse({ description: 'Resource already exists' }),
  [HttpStatus.INTERNAL_SERVER_ERROR]: () =>
    ApiInternalServerErrorResponse({ description: 'Internal server error' }),
};

const DEFAULT_ERRORS: HttpStatus[] = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.INTERNAL_SERVER_ERROR,
];

const buildDecorators = (
  status: HttpStatus,
  {
    summary,
    description,
    body,
    response,
    params,
    errors,
    tag,
    roles,
  }: IOptions,
) => {
  const decorators: MethodDecorator[] = [
    ApiOperation({ summary, description }),
    ApiResponse({
      status,
      description: description ?? getDefaultDescription(status),
      type: response,
    }),
  ];

  if (tag) {
    decorators.push(ApiTags(tag));
  }

  if (roles?.length) {
    decorators.push(ApiSecurity('roles', roles));
  }

  if (body) {
    decorators.push(ApiBody({ type: body }));
  }

  if (params) {
    decorators.push(ApiParam({ name: params.name, type: params }));
  }

  const errorStatuses = errors ?? DEFAULT_ERRORS;
  for (const errorStatus of errorStatuses) {
    const factory =
      ERROR_DECORATORS[errorStatus as keyof typeof ERROR_DECORATORS];
    if (factory) decorators.push(factory());
  }

  return applyDecorators(...decorators);
};

const getDefaultDescription = (status: HttpStatus): string => {
  const map: Partial<Record<HttpStatus, string>> = {
    [HttpStatus.OK]: 'Request successful',
    [HttpStatus.CREATED]: 'Resource created successfully',
    [HttpStatus.NO_CONTENT]: 'Resource deleted successfully',
  };
  return map[status] ?? 'Success';
};

export const ApiOkResponse = (options: IOptions) =>
  buildDecorators(HttpStatus.OK, options);

export const ApiCreatedResponse = (options: IOptions) =>
  buildDecorators(HttpStatus.CREATED, options);

export const ApiNoContentResponse = (
  options: Omit<IOptions, 'body' | 'response'>,
) => buildDecorators(HttpStatus.NO_CONTENT, options);
