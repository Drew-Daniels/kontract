import {
  get,
  post,
  put,
  del,
  noContent,
  defineController,
} from '../../src/index.js'
import {
  User,
  UserList,
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  HealthResponse,
} from '../schemas/user.js'
import { store } from '../store.js'

export const usersController = defineController({
  tag: 'Users',
  description: 'User management endpoints',
}, {
  health: get('/api/v1/health',
    async ({ reply }) => {
      return reply.ok({
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      })
    },
    {
      summary: 'Health check',
      description: 'Returns the health status of the API',
      responses: {
        200: { schema: HealthResponse, description: 'API is healthy' },
      },
    },
  ),

  listUsers: get('/api/v1/users',
    async ({ query, reply }) => {
      const page = query.page ?? 1
      const limit = query.limit ?? 10
      const result = store.list(page, limit)
      return reply.ok({
        data: result.data,
        total: result.total,
        page,
        limit,
      })
    },
    {
      summary: 'List all users',
      description: 'Returns a paginated list of users',
      query: UserListQuery,
      responses: {
        200: { schema: UserList, description: 'List of users' },
      },
    },
  ),

  getUser: get('/api/v1/users/:id',
    async ({ params, reply, error }) => {
      const user = store.get(params.id)
      if (!user) {
        return error.notFound('User not found')
      }
      return reply.ok(user)
    },
    {
      summary: 'Get user by ID',
      description: 'Returns a single user by their ID',
      responses: {
        200: { schema: User, description: 'The user' },
        404: null,
      },
    },
  ),

  createUser: post('/api/v1/users',
    async ({ body, reply }) => {
      const user = store.create(body)
      return reply.created(user)
    },
    {
      summary: 'Create a new user',
      description: 'Creates a new user and returns the created entity',
      body: CreateUserRequest,
      responses: {
        201: { schema: User, description: 'Created user' },
        422: null,
      },
    },
  ),

  updateUser: put('/api/v1/users/:id',
    async ({ params, body, reply, error }) => {
      const user = store.update(params.id, body)
      if (!user) {
        return error.notFound('User not found')
      }
      return reply.ok(user)
    },
    {
      summary: 'Update a user',
      description: 'Updates an existing user by ID',
      body: UpdateUserRequest,
      responses: {
        200: { schema: User, description: 'Updated user' },
        404: null,
      },
    },
  ),

  deleteUser: del('/api/v1/users/:id',
    async ({ params, error }) => {
      const deleted = store.delete(params.id)
      if (!deleted) {
        return error.notFound('User not found')
      }
      return noContent()
    },
    {
      summary: 'Delete a user',
      description: 'Deletes a user by ID',
      responses: {
        204: null,
        404: null,
      },
    },
  ),
})
