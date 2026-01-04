# Basic CRUD Example

A complete example of a RESTful API with create, read, update, and delete operations.

## Schemas

```typescript
// schemas/book.ts
import { Type, Static } from '@sinclair/typebox'

export const Book = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  author: Type.String(),
  isbn: Type.String(),
  publishedAt: Type.String({ format: 'date' }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, {
  $id: 'Book',
  description: 'A book in the catalog',
})

export type BookType = Static<typeof Book>

export const CreateBookRequest = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  author: Type.String({ minLength: 1, maxLength: 100 }),
  isbn: Type.String({ pattern: '^978-\\d{10}$' }),
  publishedAt: Type.String({ format: 'date' }),
}, {
  $id: 'CreateBookRequest',
})

export type CreateBookRequestType = Static<typeof CreateBookRequest>

export const UpdateBookRequest = Type.Partial(
  Type.Pick(CreateBookRequest, ['title', 'author', 'isbn', 'publishedAt'])
)

export type UpdateBookRequestType = Static<typeof UpdateBookRequest>

// Explicit params schema for UUID validation - automatic inference only gives string type
export const BookParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

export const ListBooksQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String()),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('title'),
    Type.Literal('author'),
    Type.Literal('publishedAt'),
  ])),
  order: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc'),
  ])),
})

export const BookListResponse = Type.Object({
  data: Type.Array(Book),
  meta: Type.Object({
    total: Type.Integer(),
    page: Type.Integer(),
    limit: Type.Integer(),
    totalPages: Type.Integer(),
  }),
})
```

## Controller

```typescript
// controllers/books.controller.ts
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/hono'
import {
  Book,
  BookType,
  CreateBookRequest,
  UpdateBookRequest,
  BookParams,
  ListBooksQuery,
  BookListResponse,
} from '../schemas/book.js'

// Mock data store
const books = new Map<string, BookType>()

export const booksController = defineController(
  {
    tag: 'Books',
    description: 'Book catalog management',
    prefix: '/api/v1/books',
  },
  {
    listBooks: get('/',
      {
        summary: 'List all books',
        description: 'Returns a paginated list of books with optional filtering',
        query: ListBooksQuery,
        responses: { 200: { schema: BookListResponse } },
      },
      async ({ query, reply }) => {
        let results = Array.from(books.values())

        // Search filter
        if (query.search) {
          const search = query.search.toLowerCase()
          results = results.filter(b =>
            b.title.toLowerCase().includes(search) ||
            b.author.toLowerCase().includes(search)
          )
        }

        // Sorting
        if (query.sortBy) {
          results.sort((a, b) => {
            const aVal = a[query.sortBy!]
            const bVal = b[query.sortBy!]
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            return query.order === 'desc' ? -cmp : cmp
          })
        }

        // Pagination
        const total = results.length
        const page = query.page ?? 1
        const limit = query.limit ?? 20
        const totalPages = Math.ceil(total / limit)
        const offset = (page - 1) * limit
        const data = results.slice(offset, offset + limit)

        return reply.ok({
          data,
          meta: { total, page, limit, totalPages },
        })
      }
    ),

    getBook: get('/:id',
      {
        summary: 'Get a book by ID',
        params: BookParams,
        responses: {
          200: { schema: Book, description: 'The requested book' },
          404: { schema: null, description: 'Book not found' },
        },
      },
      async ({ params, reply }) => {
        const book = books.get(params.id)
        if (!book) {
          return reply.notFound('Book not found')
        }
        return reply.ok(book)
      }
    ),

    createBook: post('/',
      {
        summary: 'Create a new book',
        auth: 'required',
        body: CreateBookRequest,
        responses: {
          201: { schema: Book, description: 'Book created successfully' },
          409: { schema: null, description: 'Book with ISBN already exists' },
          422: { schema: null, description: 'Validation error' },
        },
      },
      async ({ body, reply }) => {
        // Check for duplicate ISBN
        const existing = Array.from(books.values()).find(b => b.isbn === body.isbn)
        if (existing) {
          return reply.conflict('A book with this ISBN already exists')
        }

        const now = new Date().toISOString()
        const book: BookType = {
          id: crypto.randomUUID(),
          ...body,
          createdAt: now,
          updatedAt: now,
        }

        books.set(book.id, book)
        return reply.created(book)
      }
    ),

    updateBook: patch('/:id',
      {
        summary: 'Update a book',
        auth: 'required',
        params: BookParams,
        body: UpdateBookRequest,
        responses: {
          200: { schema: Book, description: 'Book updated successfully' },
          404: { schema: null, description: 'Book not found' },
          409: { schema: null, description: 'ISBN conflict' },
        },
      },
      async ({ params, body, reply }) => {
        const book = books.get(params.id)
        if (!book) {
          return reply.notFound('Book not found')
        }

        // Check ISBN uniqueness if changing
        if (body.isbn && body.isbn !== book.isbn) {
          const existing = Array.from(books.values()).find(b => b.isbn === body.isbn)
          if (existing) {
            return reply.conflict('A book with this ISBN already exists')
          }
        }

        const updated: BookType = {
          ...book,
          ...body,
          updatedAt: new Date().toISOString(),
        }

        books.set(params.id, updated)
        return reply.ok(updated)
      }
    ),

    deleteBook: del('/:id',
      {
        summary: 'Delete a book',
        auth: 'required',
        params: BookParams,
        responses: {
          204: { schema: null, description: 'Book deleted' },
          404: { schema: null, description: 'Book not found' },
        },
      },
      async ({ params, reply }) => {
        if (!books.has(params.id)) {
          return reply.notFound('Book not found')
        }

        books.delete(params.id)
        return reply.noContent()
      }
    ),
  }
)
```

## Sample Requests

### Create a Book

```bash
curl -X POST http://localhost:3000/api/v1/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "isbn": "978-0743273565",
    "publishedAt": "1925-04-10"
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "978-0743273565",
  "publishedAt": "1925-04-10",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### List Books with Filtering

```bash
curl "http://localhost:3000/api/v1/books?search=gatsby&sortBy=title&order=asc&page=1&limit=10"
```

Response:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn": "978-0743273565",
      "publishedAt": "1925-04-10",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Update a Book

```bash
curl -X PATCH http://localhost:3000/api/v1/books/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{ "title": "The Great Gatsby (Revised Edition)" }'
```

### Delete a Book

```bash
curl -X DELETE http://localhost:3000/api/v1/books/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer token"
```

Response: `204 No Content`
