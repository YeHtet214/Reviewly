import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from '@/src/lib/prisma'
import { randomUUID } from 'crypto'

export const authConfig = {
  emailAndPassword: {
    enabled: true,
  },
  // @ts-ignore - generateId is valid but not in types
  generateId: () => randomUUID(),
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  ...authConfig,
})