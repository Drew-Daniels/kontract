/**
 * Test controller using the builder pattern (defineRoute/defineController).
 * This tests the type-safe alternative to decorators.
 */
import { Type } from '@sinclair/typebox'
import {
  defineRoute,
  defineController,
  ok,
  created,
  noContent,
  apiError,
} from 'kontract'

// ===== Schemas =====

const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
})

const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0, maximum: 150 })),
})

const UserParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

const PaginationQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
})

// ===== Endpoints =====

const listUsers = defineRoute({
  route: 'GET /users',
  summary: 'List all users',
  query: PaginationQuery,
  responses: {
    200: { schema: Type.Array(UserSchema), description: 'List of users' },
  },
}, async ({ query }) => {
  // Type inference test: query.page and query.limit are typed
  const page = query.page ?? 1

  return ok(Type.Array(UserSchema), [
    { id: '123e4567-e89b-12d3-a456-426614174000', name: `User ${page}`, email: `user${page}@test.com` },
  ])
})

const getUser = defineRoute({
  route: 'GET /users/:id',
  summary: 'Get user by ID',
  params: UserParams,
  responses: {
    200: { schema: UserSchema, description: 'The user' },
    404: null,
  },
}, async ({ params }) => {
  // Type inference test: params.id is typed as string
  if (params.id === '00000000-0000-0000-0000-000000000000') {
    return apiError.notFound('User not found')
  }

  return ok(UserSchema, {
    id: params.id,
    name: 'Test User',
    email: 'test@test.com',
  })
})

const createUser = defineRoute({
  route: 'POST /users',
  summary: 'Create a new user',
  body: CreateUserRequest,
  responses: {
    201: { schema: UserSchema, description: 'Created user' },
    400: null,
  },
}, async ({ body }) => {
  // Type inference test: body.name, body.email, body.age are all typed
  return created(UserSchema, {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: body.name,
    email: body.email,
  })
})

const deleteUser = defineRoute({
  route: 'DELETE /users/:id',
  summary: 'Delete a user',
  params: UserParams,
  auth: 'required',
  responses: {
    204: null,
    404: null,
  },
}, async ({ params }) => {
  if (params.id === '00000000-0000-0000-0000-000000000000') {
    return apiError.notFound('User not found')
  }
  return noContent()
})

const optionalAuthEndpoint = defineRoute({
  route: 'GET /profile',
  summary: 'Get profile (optional auth)',
  auth: 'optional',
  responses: {
    200: { schema: UserSchema },
  },
}, async ({ user }) => {
  // user is undefined or authenticated user
  if (user) {
    const userData = user as { id: string; name: string; email: string }
    return ok(UserSchema, {
      id: userData.id,
      name: userData.name,
      email: userData.email,
    })
  }

  return ok(UserSchema, {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Anonymous',
    email: 'anonymous@test.com',
  })
})

// ===== Controller =====

export const usersController = defineController({
  tag: 'Users',
  description: 'User management endpoints',
  prefix: '/api/v1',
}, {
  listUsers,
  getUser,
  createUser,
  deleteUser,
  optionalAuthEndpoint,
})
