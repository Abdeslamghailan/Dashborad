import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { telegramId: 'admin_demo' },
    update: {},
    create: {
      telegramId: 'admin_demo',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    }
  });

  console.log('Created admin user:', admin);

  // Create CMH1 entity with existing mock data
  const cmh1Data = {
    reporting: {
      parentCategories: [
        {
          id: 'cat_ip1',
          name: 'IP 1 REPORTING',
          profiles: [
            { 
              id: 'p_ip_5', 
              profileName: 'CMH1_P_IP_5', 
              connected: true, 
              blocked: false, 
              type: 'IP 1',
              mainIp: '185.225.233.166',
              sessionCount: 15140,
              successCount: 13761,
              errorCount: 1379
            },
            { 
              id: 'p_ip_7', 
              profileName: 'CMH1_P_IP_7', 
              connected: true, 
              blocked: false, 
              type: 'IP 1',
              mainIp: '38.242.255.197',
              sessionCount: 15161,
              successCount: 13822,
              errorCount: 1339
            },
            { 
              id: 'p_ip_4', 
              profileName: 'CMH1_P_IP_4', 
              connected: true, 
              blocked: false,
              type: 'IP 1',
              mainIp: '144.126.139.94',
              sessionCount: 15151,
              successCount: 9670,
              errorCount: 5481
            },
            { 
              id: 'p_ip_1', 
              profileName: 'CMH1_P_IP_1', 
              connected: true, 
              blocked: false, 
              type: 'IP 1',
              mainIp: '38.242.192.181',
              sessionCount: 15000,
              successCount: 14254,
              errorCount: 746
            }
          ],
          planConfiguration: {
            drops: [
              { id: 'd1', value: 3000 },
              { id: 'd2', value: 4500 },
              { id: 'd3', value: 6000 },
              { id: 'd4', value: 4500 },
              { id: 'd5', value: 3000 },
              { id: 'd6', value: 2000 },
              { id: 'd7', value: 4500 },
              { id: 'd8', value: 6000 },
              { id: 'd9', value: 4500 },
              { id: 'd10', value: 3000 },
              { id: 'd11', value: 2000 },
              { id: 'd12', value: 3000 }
            ],
            seeds: 0,
            timeConfig: { startTime: '09:00', endTime: '21:00' },
            scriptName: 'CMH1_Warmup_Script_v2',
            scenario: 'Standard_Rotation_A'
          }
        },
        {
          id: 'cat_offer',
          name: 'Offer Warmup REPORTING',
          profiles: [
            { 
              id: 'p_reply_3', 
              profileName: 'CMH1_P_REPLY_3', 
              connected: false, 
              blocked: true, 
              type: 'Offer',
              mainIp: '74.81.44.156',
              sessionCount: 15159,
              successCount: 2735,
              errorCount: 12424
            },
            { 
              id: 'p_reply_1', 
              profileName: 'CMH1_P_REPLY_1', 
              connected: true, 
              blocked: true, 
              type: 'Offer',
              mainIp: '194.163.148.255',
              sessionCount: 15026,
              successCount: 7963,
              errorCount: 7063
            }
          ],
          planConfiguration: {
            drops: [
              { id: 'd1', value: 0 }, { id: 'd2', value: 0 }, { id: 'd3', value: 0 },
              { id: 'd4', value: 0 }, { id: 'd5', value: 0 }, { id: 'd6', value: 0 },
              { id: 'd7', value: 0 }, { id: 'd8', value: 0 }, { id: 'd9', value: 0 },
              { id: 'd10', value: 0 }, { id: 'd11', value: 0 }, { id: 'd12', value: 0 }
            ],
            seeds: 0,
            timeConfig: { startTime: '08:00', endTime: '20:00' },
            scriptName: 'Offer_Warmup_V1',
            scenario: ''
          }
        }
      ]
    },
    limitsConfiguration: [
      { 
        id: 'l_ip_5', 
        profileName: 'CMH1_P_IP_5', 
        limitActiveSession: '1-14322', 
        intervalsQuality: '1-500',
        intervalsPausedSearch: '1-500',
        intervalsToxic: '1-500',
        intervalsOther: '601-700',
        totalPaused: 2000
      },
      { 
        id: 'l_ip_7', 
        profileName: 'CMH1_P_IP_7', 
        limitActiveSession: '1-14190', 
        intervalsQuality: '1-500',
        intervalsPausedSearch: 'NO',
        intervalsToxic: 'NO',
        intervalsOther: 'NO',
        totalPaused: 500
      },
      { 
        id: 'l_ip_4', 
        profileName: 'CMH1_P_IP_4', 
        limitActiveSession: '1-10049', 
        intervalsQuality: '1-500',
        intervalsPausedSearch: 'NO',
        intervalsToxic: 'NO',
        intervalsOther: 'NO',
        totalPaused: 500
      },
      { 
        id: 'l_ip_1', 
        profileName: 'CMH1_P_IP_1', 
        limitActiveSession: '1-11736', 
        intervalsQuality: '1-500',
        intervalsPausedSearch: 'NO',
        intervalsToxic: 'NO',
        intervalsOther: 'NO',
        totalPaused: 500
      },
      { 
        id: 'l_reply_3', 
        profileName: 'CMH1_P_REPLY_3', 
        limitActiveSession: '1-2782', 
        intervalsQuality: 'NO',
        intervalsPausedSearch: 'NO',
        intervalsToxic: 'NO',
        intervalsOther: 'NO',
        totalPaused: 0
      },
      { 
        id: 'l_reply_1', 
        profileName: 'CMH1_P_REPLY_1', 
        limitActiveSession: '1-8265', 
        intervalsQuality: 'NO',
        intervalsPausedSearch: 'NO',
        intervalsToxic: 'NO',
        intervalsOther: 'NO',
        totalPaused: 0
      }
    ]
  };

  const entity = await prisma.entity.upsert({
    where: { id: 'ent_cmh1' },
    update: {},
    create: {
      id: 'ent_cmh1',
      name: 'CMH1',
      data: JSON.stringify(cmh1Data)
    }
  });

  console.log('Created entity:', entity);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
