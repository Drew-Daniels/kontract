import type { UserType, CreateUserRequestType, UpdateUserRequestType } from './app/schemas/user.js'

let idCounter = 1

function generateId(): string {
  return `user_${String(idCounter++).padStart(6, '0')}`
}

const users: Map<string, UserType> = new Map()

// Seed with initial data
const seedUsers: Array<{ name: string; email: string }> = [
  { name: 'Alice Johnson', email: 'alice@example.com' },
  { name: 'Bob Smith', email: 'bob@example.com' },
  { name: 'Carol Williams', email: 'carol@example.com' },
  { name: 'David Brown', email: 'david@example.com' },
  { name: 'Eve Davis', email: 'eve@example.com' },
]

for (const seed of seedUsers) {
  const id = generateId()
  users.set(id, {
    id,
    name: seed.name,
    email: seed.email,
    createdAt: new Date().toISOString(),
  })
}

export const store = {
  list(page: number, limit: number): { data: UserType[]; total: number } {
    const all = Array.from(users.values())
    const start = (page - 1) * limit
    const end = start + limit
    return {
      data: all.slice(start, end),
      total: all.length,
    }
  },

  get(id: string): UserType | undefined {
    return users.get(id)
  },

  create(data: CreateUserRequestType): UserType {
    const id = generateId()
    const user: UserType = {
      id,
      name: data.name,
      email: data.email,
      createdAt: new Date().toISOString(),
    }
    users.set(id, user)
    return user
  },

  update(id: string, data: UpdateUserRequestType): UserType | undefined {
    const existing = users.get(id)
    if (!existing) return undefined

    const updated: UserType = {
      ...existing,
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
    }
    users.set(id, updated)
    return updated
  },

  delete(id: string): boolean {
    return users.delete(id)
  },
}
