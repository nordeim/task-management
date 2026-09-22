import { PrismaClient } from '@prisma/client'
import { resolveDatabaseUrl } from './db-path'

// The datasource URL is resolved through db-path so a relative
// DATABASE_URL always lands at <repo>/db/custom.db regardless of the
// process working directory (the operator's contract — see
// tests/db-path.test.ts and docs/remediation-plan-session21.md, Finding 2).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
    datasources: { db: { url: resolveDatabaseUrl() } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db