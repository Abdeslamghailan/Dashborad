import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

const prismaProxy = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!prismaInstance) {
      console.log('Initializing Prisma Client (lazy-load)');
      prismaInstance = new PrismaClient();
    }
    return (prismaInstance as any)[prop];
  }
});

export default prismaProxy;
