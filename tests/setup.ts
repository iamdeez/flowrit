import { vi } from 'vitest'

// Resend SDK throws at constructor time when key is undefined
process.env.RESEND_API_KEY = 're_test_key'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  AuthError: class AuthError extends Error {
    type = 'AuthError'
  },
}))
