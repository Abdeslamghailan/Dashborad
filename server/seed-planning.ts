import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTeamPlanning() {
  console.log('Seeding team planning data...');

  // Create teams
  const desktop = await prisma.team.upsert({
    where: { name: 'DESKTOP' },
    update: {},
    create: {
      name: 'DESKTOP',
      displayName: 'DESKTOP',
      order: 1,
      color: '#4F46E5'
    }
  });

  const webautomat = await prisma.team.upsert({
    where: { name: 'Webautomat' },
    update: {},
    create: {
      name: 'Webautomat',
      displayName: 'Webautomat',
      order: 2,
      color: '#7C3AED'
    }
  });

  const hotmail = await prisma.team.upsert({
    where: { name: 'HOTMAIL' },
    update: {},
    create: {
      name: 'HOTMAIL',
      displayName: 'HOTMAIL',
      order: 3,
      color: '#DC2626'
    }
  });

  const gmail = await prisma.team.upsert({
    where: { name: 'Gmail' },
    update: {},
    create: {
      name: 'Gmail',
      displayName: 'Gmail',
      order: 4,
      color: '#059669'
    }
  });

  console.log('Teams created');

  // Create mailers for DESKTOP team
  const desktopMailers = [
    'Khadija Hafid',
    'Hicham El Ouafir',
    'Mohamed Fertoul',
    'Ihsan Habous',
    'Abdellah Kchida',
    'Youness Akamim'
  ];

  for (let i = 0; i < desktopMailers.length; i++) {
    await prisma.mailer.upsert({
      where: { id: `desktop-${i}` },
      update: {},
      create: {
        id: `desktop-${i}`,
        name: desktopMailers[i],
        teamId: desktop.id,
        order: i,
        isActive: true
      }
    });
  }

  // Create mailers for Webautomat team
  const webautomatMailers = [
    'Hamza AITMANE',
    'Mohamed El MASSANI',
    'Mariyat Dahha',
    'Ayoub Aharrouche',
    'Ilyas Hamdi'
  ];

  for (let i = 0; i < webautomatMailers.length; i++) {
    await prisma.mailer.upsert({
      where: { id: `webautomat-${i}` },
      update: {},
      create: {
        id: `webautomat-${i}`,
        name: webautomatMailers[i],
        teamId: webautomat.id,
        order: i,
        isActive: true
      }
    });
  }

  // Create mailers for HOTMAIL team
  const hotmailMailers = [
    'Oussama Bek',
    'Mohamed Bengharam'
  ];

  for (let i = 0; i < hotmailMailers.length; i++) {
    await prisma.mailer.upsert({
      where: { id: `hotmail-${i}` },
      update: {},
      create: {
        id: `hotmail-${i}`,
        name: hotmailMailers[i],
        teamId: hotmail.id,
        order: i,
        isActive: true
      }
    });
  }

  console.log('Mailers created');
  console.log('Team planning seed completed!');
}

seedTeamPlanning()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
