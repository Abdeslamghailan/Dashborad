import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TASK_COLORS: Record<string, string> = {
    'CMH3': '#90EE90',
    'CMH9': '#90EE90',
    'CMH12': '#FFFFE0',
    'CMH5': '#FFFFE0',
    'CMH16': '#FFFFE0',
    'HOTMAIL': '#FFD700',
    'Gmail': '#FFD700',
    'Desktop': '#FFA500',
    'Webautomat': '#FFA500',
    'Night Desktop': '#FFA500',
    'Night tool it': '#FFA500',
    'congé': '#FFB6C1',
    'default': '#E0E0E0'
};

async function seedPlanningData() {
    console.log('Seeding planning assignments...');

    // Get current week schedule
    const currentWeek = await prisma.planningSchedule.findFirst({
        where: { isCurrent: true }
    });

    if (!currentWeek) {
        console.log('No current week found. Please initialize weeks first.');
        return;
    }

    // Get all mailers
    const desktopMailers = await prisma.mailer.findMany({
        where: { team: { name: 'DESKTOP' } },
        orderBy: { order: 'asc' }
    });

    const webautomatMailers = await prisma.mailer.findMany({
        where: { team: { name: 'Webautomat' } },
        orderBy: { order: 'asc' }
    });

    const hotmailMailers = await prisma.mailer.findMany({
        where: { team: { name: 'HOTMAIL' } },
        orderBy: { order: 'asc' }
    });

    // Sample assignments based on your Excel image
    const assignments = [
        // Khadija Hafid (desktop-0)
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 0, taskCode: 'CMH3', taskColor: TASK_COLORS['CMH3'] },
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 1, taskCode: 'CMH12-CMH5-CMH16', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 2, taskCode: 'CMH12-CMH5-CMH16', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 3, taskCode: 'CMH12-CMH5-CMH16', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 4, taskCode: 'CMH12-CMH5-CMH16', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 5, taskCode: 'CMH9-CMH16', taskColor: TASK_COLORS['CMH9'] },
        { mailerId: desktopMailers[0]?.id, dayOfWeek: 6, taskCode: 'CMH3-CMH5-16', taskColor: TASK_COLORS['CMH3'] },

        // Hicham El Ouafir (desktop-1)
        { mailerId: desktopMailers[1]?.id, dayOfWeek: 0, taskCode: 'CMH3', taskColor: TASK_COLORS['CMH3'] },
        { mailerId: desktopMailers[1]?.id, dayOfWeek: 1, taskCode: 'CMH3-CMH9', taskColor: TASK_COLORS['CMH3'] },
        { mailerId: desktopMailers[1]?.id, dayOfWeek: 2, taskCode: 'CMH3-CMH9', taskColor: TASK_COLORS['CMH3'] },

        // Mohamed Fertoul (desktop-2)
        { mailerId: desktopMailers[2]?.id, dayOfWeek: 0, taskCode: 'CMH9', taskColor: TASK_COLORS['CMH9'] },

        // Youness Akamim (desktop-5)
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 0, taskCode: 'CMH12-CMH11', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 1, taskCode: 'CMH5-CMH11', taskColor: TASK_COLORS['CMH5'] },
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 2, taskCode: 'CMH5-CMH11', taskColor: TASK_COLORS['CMH5'] },
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 3, taskCode: 'CMH12-CMH11', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 4, taskCode: 'CMH12-CMH11', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 5, taskCode: 'CMH12-CMH11', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: desktopMailers[5]?.id, dayOfWeek: 6, taskCode: 'CMH12-CMH11', taskColor: TASK_COLORS['CMH12'] },

        // Webautomat team
        { mailerId: webautomatMailers[0]?.id, dayOfWeek: 0, taskCode: 'CMH12-CMH13-CMH7-CMH11', taskColor: TASK_COLORS['CMH12'] },
        { mailerId: webautomatMailers[1]?.id, dayOfWeek: 0, taskCode: 'CMH12-CMH7-CMH2', taskColor: TASK_COLORS['CMH12'] },

        // HOTMAIL team
        { mailerId: hotmailMailers[0]?.id, dayOfWeek: 0, taskCode: 'HOTMAIL', taskColor: TASK_COLORS['HOTMAIL'] },
        { mailerId: hotmailMailers[0]?.id, dayOfWeek: 1, taskCode: 'CMH9-CMH16-CMH15', taskColor: TASK_COLORS['CMH9'] },
        { mailerId: hotmailMailers[0]?.id, dayOfWeek: 2, taskCode: 'CMH9-CMH16-CMH15', taskColor: TASK_COLORS['CMH9'] },
        { mailerId: hotmailMailers[0]?.id, dayOfWeek: 3, taskCode: 'HOTMAIL-CMH9', taskColor: TASK_COLORS['HOTMAIL'] },
        { mailerId: hotmailMailers[0]?.id, dayOfWeek: 4, taskCode: 'HOTMAIL-CMH9', taskColor: TASK_COLORS['HOTMAIL'] },
        { mailerId: hotmailMailers[0]?.id, dayOfWeek: 5, taskCode: 'HOTMAIL', taskColor: TASK_COLORS['HOTMAIL'] },
    ];

    // Create assignments
    for (const assignment of assignments) {
        if (assignment.mailerId) {
            await prisma.planningAssignment.upsert({
                where: {
                    scheduleId_mailerId_dayOfWeek: {
                        scheduleId: currentWeek.id,
                        mailerId: assignment.mailerId,
                        dayOfWeek: assignment.dayOfWeek
                    }
                },
                update: {
                    taskCode: assignment.taskCode,
                    taskColor: assignment.taskColor
                },
                create: {
                    scheduleId: currentWeek.id,
                    mailerId: assignment.mailerId,
                    dayOfWeek: assignment.dayOfWeek,
                    taskCode: assignment.taskCode,
                    taskColor: assignment.taskColor
                }
            });
        }
    }

    console.log('Planning assignments seeded successfully!');
}

seedPlanningData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
