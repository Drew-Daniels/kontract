# File Uploads Example

Handling file uploads with validation for allowed types and sizes.

## Schema

```typescript
// schemas/avatar.ts
import { Type, Static } from '@sinclair/typebox'

export const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  avatarUrl: Type.Optional(Type.String({ format: 'uri' })),
}, { $id: 'User' })

export const UserParams = Type.Object({
  id: Type.String(),
})

export const UploadResponse = Type.Object({
  url: Type.String({ format: 'uri' }),
  filename: Type.String(),
  size: Type.Integer(),
  contentType: Type.String(),
})
```

## Controller

```typescript
// controllers/users.controller.ts
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from '@kontract/hono'
import { User, UserParams, UploadResponse } from '../schemas/avatar.js'

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1/users' },
  {
    uploadAvatar: post('/:id/avatar',
      {
        summary: 'Upload user avatar',
        description: 'Upload a new avatar image for the user',
        auth: 'required',
        params: UserParams,
        file: {
          fieldName: 'avatar',
          description: 'Avatar image file',
          allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          maxSize: '5MB',
          multiple: false,
        },
        responses: {
          200: { schema: User, description: 'User with updated avatar' },
          400: { schema: null, description: 'Invalid file type or size' },
          404: { schema: null, description: 'User not found' },
        },
      },
      async ({ params, file, user, reply }) => {
        // Validate user exists
        const targetUser = await findUser(params.id)
        if (!targetUser) {
          return reply.notFound('User not found')
        }

        // Verify ownership
        if (targetUser.id !== user.id) {
          return reply.forbidden('You can only update your own avatar')
        }

        // Process and store the file
        const avatarUrl = await storageService.upload(file, {
          folder: `avatars/${targetUser.id}`,
          resize: { width: 256, height: 256 },
        })

        // Delete old avatar if exists
        if (targetUser.avatarUrl) {
          await storageService.delete(targetUser.avatarUrl)
        }

        // Update user
        const updated = await updateUser(params.id, { avatarUrl })
        return reply.ok(updated)
      }
    ),

    deleteAvatar: del('/:id/avatar',
      {
        summary: 'Delete user avatar',
        auth: 'required',
        params: UserParams,
        responses: { 200: { schema: User }, 404: null },
      },
      async ({ params, user, reply }) => {
        const targetUser = await findUser(params.id)
        if (!targetUser) {
          return reply.notFound('User not found')
        }

        if (targetUser.id !== user.id) {
          return reply.forbidden()
        }

        if (targetUser.avatarUrl) {
          await storageService.delete(targetUser.avatarUrl)
        }

        const updated = await updateUser(params.id, { avatarUrl: null })
        return reply.ok(updated)
      }
    ),

    getAvatar: get('/:id/avatar',
      {
        summary: 'Get user avatar',
        params: UserParams,
        responses: { 200: null, 404: null },  // Binary response
      },
      async ({ params, reply }) => {
        const user = await findUser(params.id)
        if (!user || !user.avatarUrl) {
          return reply.notFound('Avatar not found')
        }

        const file = await storageService.get(user.avatarUrl)
        return reply.binary(file.contentType, file.data, 'avatar.jpg')
      }
    ),
  }
)
```

## Multi-File Upload

```typescript
const uploadGallery = post('/:id/gallery',
  {
    summary: 'Upload multiple images to gallery',
    auth: 'required',
    params: UserParams,
    file: {
      fieldName: 'images',
      description: 'Gallery images',
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      maxSize: '10MB',
      multiple: true,  // Allow multiple files
    },
    responses: {
      200: { schema: Type.Array(UploadResponse) },
      400: null,
    },
  },
  async ({ params, files, reply }) => {
    const uploads = await Promise.all(
      files.map(file => storageService.upload(file, {
        folder: `gallery/${params.id}`,
      }))
    )

    return reply.ok(uploads.map(u => ({
      url: u.url,
      filename: u.filename,
      size: u.size,
      contentType: u.contentType,
    })))
  }
)
```

## Document Upload with Metadata

```typescript
const DocumentMetadata = Type.Object({
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  category: Type.Union([
    Type.Literal('invoice'),
    Type.Literal('contract'),
    Type.Literal('report'),
  ]),
})

const uploadDocument = post('/documents',
  {
    summary: 'Upload a document with metadata',
    auth: 'required',
    body: DocumentMetadata,  // Additional form fields
    file: {
      fieldName: 'document',
      allowedExtensions: ['pdf', 'doc', 'docx'],
      maxSize: '50MB',
    },
    responses: {
      201: { schema: Document },
      400: null,
    },
  },
  async ({ body, file, user, reply }) => {
    const url = await storageService.upload(file, {
      folder: `documents/${user.id}`,
    })

    const document = await createDocument({
      ...body,
      url,
      filename: file.originalName,
      size: file.size,
      uploadedBy: user.id,
    })

    return reply.created(document)
  }
)
```

## Sample Request

### Upload Avatar (curl)

```bash
curl -X POST http://localhost:3000/api/v1/users/123/avatar \
  -H "Authorization: Bearer token" \
  -F "avatar=@/path/to/image.jpg"
```

### Upload with Metadata (JavaScript)

```typescript
const formData = new FormData()
formData.append('document', file)
formData.append('title', 'Q4 Report')
formData.append('category', 'report')

const response = await fetch('/api/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
})
```

## OpenAPI Output

The file upload generates proper OpenAPI documentation:

```yaml
/api/v1/users/{id}/avatar:
  post:
    summary: Upload user avatar
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            required:
              - avatar
            properties:
              avatar:
                type: string
                format: binary
                description: Avatar image file
    responses:
      200:
        description: User with updated avatar
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
```
