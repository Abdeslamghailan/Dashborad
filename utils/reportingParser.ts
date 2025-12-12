import { ParentCategory, Profile, ProfileType } from '../types';

export const parseReportingData = (rawData: string): { categories: ParentCategory[], sessions: Profile[] } => {
  const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);
  
  let categoryNames: string[] = [];
  const sessions: Profile[] = [];
  
  // Temporary storage
  let sessionNames: string[] = [];
  let mainIps: string[] = [];
  let sessionCounts: number[] = [];
  let connectedCounts: number[] = [];
  let blockedCounts: number[] = [];

  // Track state for multi-line parsing
  let foundReportingHeader = false;
  let nextLineIsConnected = false;
  let nextLineIsBlocked = false;
  let nextLineIsSessionCount = false;

  lines.forEach((line, index) => {
    const parts = line.split(/\t+/).map(p => p.trim()).filter(p => p);
    
    // Skip empty lines
    if (parts.length === 0) return;
    
    const firstCol = parts[0].toLowerCase();
    const lineUpper = line.toUpperCase();

    // 1. Check for "Reporting" header (might be on its own line)
    if (firstCol === 'reporting' && !foundReportingHeader) {
      foundReportingHeader = true;
      // Check if next line has "Types"
      if (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const nextParts = nextLine.split(/\t+/).map(p => p.trim()).filter(p => p);
        if (nextParts[0].toLowerCase() === 'types') {
          // Extract categories from this line
          categoryNames = nextParts.slice(1).filter(p => 
            p.toUpperCase() !== 'TOTALS' && 
            p.toLowerCase() !== 'types'
          );
        }
      }
      return;
    }

    // 2. Alternative: "Reporting Types" on same line or just "Types"
    if ((firstCol.includes('reporting') && firstCol.includes('types')) || firstCol === 'types') {
      categoryNames = parts.slice(1).filter(p => 
        p.toUpperCase() !== 'TOTALS' && 
        !p.toLowerCase().includes('reporting') &&
        !p.toLowerCase().includes('types')
      );
      return;
    }

    // 3. Detect "Connected" or "Success" header - next line will have the data
    if (firstCol === 'connected' || lineUpper.trim() === 'CONNECTED' || 
        firstCol === 'success' || lineUpper.trim() === 'SUCCESS') {
      nextLineIsConnected = true;
      return;
    }

    // 4. Detect "Blocked" or "Errors" header - next line will have the data
    if (firstCol === 'blocked' || lineUpper.trim() === 'BLOCKED' ||
        firstCol === 'errors' || lineUpper.trim() === 'ERRORS') {
      nextLineIsBlocked = true;
      return;
    }

    // 5. Detect "Session" followed by "Count" on next line
    if (firstCol === 'session' && !firstCol.includes('σ(')) {
      // Check if this is the session names line or session count header
      if (parts.length > 2 && parts.some(p => p.includes('_'))) {
        // This is the session names line
        const potentialSessions = parts.slice(1).filter(p => 
          p.toUpperCase() !== 'TOTALS' &&
          !p.toLowerCase().includes('session') &&
          !p.match(/^σ\(/i)
        );
        if (potentialSessions.length > 0) {
          sessionNames = potentialSessions;
        }
      } else {
        // This is "Session" header, next line is "Count"
        nextLineIsSessionCount = true;
      }
      return;
    }

    // 6. Parse line that starts with Σ(...) - this contains actual data
    if (firstCol.startsWith('σ(')) {
      const values = parts.slice(1).filter(p => 
        p.toUpperCase() !== 'TOTALS' &&
        !p.match(/^σ\(/i) &&
        /^\d+$/.test(p.replace(/,/g, ''))
      );

      if (nextLineIsConnected && values.length > 0) {
        connectedCounts = values.map(v => parseInt(v.replace(/,/g, '')) || 0);
        nextLineIsConnected = false;
        return;
      }

      if (nextLineIsBlocked && values.length > 0) {
        blockedCounts = values.map(v => parseInt(v.replace(/,/g, '')) || 0);
        nextLineIsBlocked = false;
        return;
      }

      if (nextLineIsSessionCount && values.length > 0) {
        sessionCounts = values.map(v => parseInt(v.replace(/,/g, '')) || 0);
        nextLineIsSessionCount = false;
        return;
      }

      // If it's a Σ line but not flagged, it might be session names
      if (sessionNames.length === 0) {
        const potentialSessions = parts.slice(1).filter(p => 
          p.toUpperCase() !== 'TOTALS' &&
          !p.match(/^σ\(/i) &&
          p.includes('_')
        );
        if (potentialSessions.length > 0) {
          sessionNames = potentialSessions;
        }
      }
      return;
    }

    // 7. Parse "Count" line (when it appears alone after "Session")
    if (firstCol === 'count') {
      const values = parts.slice(1).filter(p => 
        p.toUpperCase() !== 'TOTALS' &&
        /^\d+$/.test(p.replace(/,/g, ''))
      );
      if (values.length > 0) {
        sessionCounts = values.map(v => parseInt(v.replace(/,/g, '')) || 0);
      }
      return;
    }

    // 8. Parse "MainIp" line
    if (firstCol.includes('mainip') || firstCol.includes('main ip')) {
      mainIps = parts.slice(1).filter(p => 
        p.toUpperCase() !== 'TOTALS' &&
        !p.toLowerCase().includes('mainip')
      );
      return;
    }

    // 9. Skip summary rows with "By Type"
    if (firstCol.includes('by type')) {
      return;
    }
  });

  console.log('Parser debug:', {
    categoryNames,
    sessionNames: sessionNames.length,
    mainIps: mainIps.length,
    sessionCounts,
    connectedCounts,
    blockedCounts
  });

  // Construct Profiles from parsed data
  const maxLength = Math.max(
    sessionNames.length,
    mainIps.length,
    sessionCounts.length,
    connectedCounts.length,
    blockedCounts.length
  );

  for (let i = 0; i < maxLength; i++) {
    const name = sessionNames[i] || `Session_${i + 1}`;
    
    // Determine type based on session name
    let type: ProfileType = 'Other';
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes('_IP_') || nameUpper.includes('_DM_')) {
      type = 'IP 1';
    } else if (nameUpper.includes('_OFFER_') || nameUpper.includes('_REPLY_')) {
      type = 'Offer';
    }
    
    sessions.push({
      id: `prof_${Date.now()}_${i}`,
      profileName: name,
      type: type,
      mainIp: mainIps[i] || '',
      sessionCount: sessionCounts[i] || 0,
      successCount: connectedCounts[i] || 0,
      errorCount: blockedCounts[i] || 0,
      connected: (connectedCounts[i] || 0) > 0,
      blocked: (blockedCounts[i] || 0) > 0
    });
  }

  // Construct Categories
  const categories: ParentCategory[] = categoryNames.map((name, index) => ({
    id: `cat_${Date.now()}_${index}`,
    name: name,
    profiles: [],
    planConfiguration: {
      drops: [],
      seeds: 0,
      timeConfig: { startTime: '09:00', endTime: '17:00' },
      scriptName: '',
      scenario: '',
      status: 'active',
      mode: 'auto'
    }
  }));

  // If no categories were found, create default ones based on session types
  if (categories.length === 0) {
    const hasIP = sessions.some(s => s.type === 'IP 1');
    const hasOffer = sessions.some(s => s.type === 'Offer');
    
    if (hasIP) {
      categories.push({
        id: `cat_${Date.now()}_0`,
        name: 'IP 1 REPORTING',
        profiles: [],
        planConfiguration: {
          drops: [],
          seeds: 0,
          timeConfig: { startTime: '09:00', endTime: '17:00' },
          scriptName: '',
          scenario: '',
          status: 'active',
          mode: 'auto'
        }
      });
    }
    
    if (hasOffer) {
      categories.push({
        id: `cat_${Date.now()}_1`,
        name: 'Offer Warmup REPORTING',
        profiles: [],
        planConfiguration: {
          drops: [],
          seeds: 0,
          timeConfig: { startTime: '09:00', endTime: '17:00' },
          scriptName: '',
          scenario: '',
          status: 'active',
          mode: 'auto'
        }
      });
    }
  }

  return { categories, sessions };
};
