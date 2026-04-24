import prisma from './db.js';

async function dump() {
    const teams = await prisma.team.findMany({
        include: { mailers: true }
    });
    const schedules = await prisma.planningSchedule.findMany({
        where: { OR: [{ isCurrent: true }, { isNext: true }] }
    });
    console.log(JSON.stringify({ teams, schedules }, null, 2));
}

dump();
