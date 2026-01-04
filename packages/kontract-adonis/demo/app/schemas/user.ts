import { Type, Static } from '@sinclair/typebox'

export const User = Type.Object({
  id: Type.String({ description: 'User ID', examples: ['user_abc123'] }),
  name: Type.String({ description: 'User name', examples: ['John Doe'] }),
  email: Type.String({ format: 'email', description: 'Email address', examples: ['john@example.com'] }),
  createdAt: Type.String({ format: 'date-time', description: 'Creation timestamp' }),
}, { $id: 'User', description: 'A user entity' })

export type UserType = Static<typeof User>

export const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1, description: 'User name', examples: ['Jane Doe'] }),
  email: Type.String({ format: 'email', description: 'Email address', examples: ['jane@example.com'] }),
}, { $id: 'CreateUserRequest', description: 'Request body for creating a user' })

export type CreateUserRequestType = Static<typeof CreateUserRequest>

export const UpdateUserRequest = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, description: 'User name' })),
  email: Type.Optional(Type.String({ format: 'email', description: 'Email address' })),
}, { $id: 'UpdateUserRequest', description: 'Request body for updating a user' })

export type UpdateUserRequestType = Static<typeof UpdateUserRequest>

export const UserListQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1, description: 'Page number', examples: [1] })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10, description: 'Items per page', examples: [10] })),
}, { $id: 'UserListQuery', description: 'Query parameters for user list' })

export type UserListQueryType = Static<typeof UserListQuery>

export const UserList = Type.Object({
  data: Type.Array(User, { description: 'List of users' }),
  total: Type.Integer({ description: 'Total count', examples: [42] }),
  page: Type.Integer({ description: 'Current page', examples: [1] }),
  limit: Type.Integer({ description: 'Items per page', examples: [10] }),
}, { $id: 'UserList', description: 'Paginated list of users' })

export type UserListType = Static<typeof UserList>

export const HealthResponse = Type.Object({
  status: Type.Literal('ok', { description: 'Health status' }),
  timestamp: Type.String({ format: 'date-time', description: 'Current server time' }),
}, { $id: 'HealthResponse', description: 'Health check response' })
