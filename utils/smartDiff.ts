/**
 * Comprehensive smart diff utility to generate human-readable change descriptions
 * Handles all tables, forms, inputs, and data structures
 */

interface DiffResult {
  changes: string[];
  hasChanges: boolean;
}

/**
 * Deep compare two objects and generate human-readable change descriptions
 */
export function generateSmartDiff(oldValue: any, newValue: any, context: string = ''): DiffResult {
  const changes: string[] = [];

  try {
    const oldObj = typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue;
    const newObj = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;

    // Compare objects recursively
    compareObjects(oldObj, newObj, context, changes);
  } catch (error) {
    // If parsing fails, do simple string comparison
    if (oldValue !== newValue) {
      changes.push(`Updated from "${oldValue}" to "${newValue}"`);
    }
  }

  return {
    changes,
    hasChanges: changes.length > 0
  };
}

function compareObjects(oldObj: any, newObj: any, path: string, changes: string[]): void {
  if (oldObj === null || newObj === null || typeof oldObj !== 'object' || typeof newObj !== 'object') {
    if (oldObj !== newObj) {
      const displayPath = path || 'Value';
      changes.push(`${displayPath}: changed from "${oldObj}" to "${newObj}"`);
    }
    return;
  }

  // Handle arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    compareArrays(oldObj, newObj, path, changes);
    return;
  }

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    const newPath = path ? `${path} → ${key}` : key;

    // Key was removed
    if (!(key in newObj)) {
      changes.push(`${newPath}: removed (was "${oldVal}")`);
      continue;
    }

    // Key was added
    if (!(key in oldObj)) {
      changes.push(`${newPath}: added with value "${newVal}"`);
      continue;
    }

    // Both exist, compare values
    if (typeof oldVal === 'object' && typeof newVal === 'object') {
      compareObjects(oldVal, newVal, newPath, changes);
    } else if (oldVal !== newVal) {
      changes.push(`${newPath}: changed from "${oldVal}" to "${newVal}"`);
    }
  }
}

function compareArrays(oldArr: any[], newArr: any[], path: string, changes: string[]): void {
  // For arrays, we'll do a simple length and item comparison
  if (oldArr.length !== newArr.length) {
    changes.push(`${path}: array length changed from ${oldArr.length} to ${newArr.length}`);
  }

  // Compare each item
  const maxLength = Math.max(oldArr.length, newArr.length);
  for (let i = 0; i < maxLength; i++) {
    const oldItem = oldArr[i];
    const newItem = newArr[i];
    const itemPath = `${path}[${i}]`;

    if (i >= oldArr.length) {
      changes.push(`${itemPath}: added`);
    } else if (i >= newArr.length) {
      changes.push(`${itemPath}: removed`);
    } else if (typeof oldItem === 'object' && typeof newItem === 'object') {
      compareObjects(oldItem, newItem, itemPath, changes);
    } else if (oldItem !== newItem) {
      changes.push(`${itemPath}: changed from "${oldItem}" to "${newItem}"`);
    }
  }
}

/**
 * Generate a smart summary for entity changes
 */
export function generateEntityChangeSummary(
  entityName: string,
  fieldChanged: string | null,
  oldValue: string | null,
  newValue: string | null
): string[] {
  const changes: string[] = [];

  if (!oldValue || !newValue) {
    return changes;
  }

  try {
    const oldData = JSON.parse(oldValue);
    const newData = JSON.parse(newValue);

    // Handle different types of changes based on fieldChanged
    if (fieldChanged?.includes('Day Plan')) {
      changes.push(...generateDayPlanChanges(entityName, oldData, newData));
    } else if (fieldChanged?.includes('reporting')) {
      changes.push(...generateReportingChanges(entityName, oldData, newData));
    } else if (fieldChanged?.includes('limits')) {
      changes.push(...generateLimitsChanges(entityName, oldData, newData));
    } else if (fieldChanged?.includes('notes')) {
      changes.push(...generateNotesChanges(entityName, oldData, newData));
    } else if (fieldChanged?.includes('status')) {
      changes.push(...generateStatusChanges(entityName, oldData, newData));
    } else if (fieldChanged?.includes('contact') || fieldChanged?.includes('email') || fieldChanged?.includes('name')) {
      changes.push(...generateBasicInfoChanges(entityName, oldData, newData));
    } else {
      // Generic change detection for any other fields
      changes.push(...generateGenericChanges(entityName, oldData, newData));
    }
  } catch (error) {
    // Fallback to simple description
    if (fieldChanged) {
      changes.push(`${entityName} — ${fieldChanged} updated`);
    }
  }

  return changes;
}

/**
 * Generate changes for basic entity information
 */
function generateBasicInfoChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];

  // Name
  if (oldData.name !== newData.name) {
    changes.push(`${entityName} — Name: changed from "${oldData.name}" to "${newData.name}"`);
  }

  // Status
  if (oldData.status !== newData.status) {
    changes.push(`${entityName} — Status: changed from "${oldData.status}" to "${newData.status}"`);
  }

  // Contact Person
  if (oldData.contactPerson !== newData.contactPerson) {
    changes.push(`${entityName} — Contact Person: changed from "${oldData.contactPerson || 'none'}" to "${newData.contactPerson || 'none'}"`);
  }

  // Email
  if (oldData.email !== newData.email) {
    changes.push(`${entityName} — Email: changed from "${oldData.email || 'none'}" to "${newData.email || 'none'}"`);
  }

  return changes;
}

/**
 * Generate changes for status field
 */
function generateStatusChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];

  if (oldData.status !== newData.status) {
    changes.push(`${entityName} — Status: changed from "${oldData.status}" to "${newData.status}"`);
  }

  return changes;
}

/**
 * Generate changes for notes
 */
function generateNotesChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];

  if (oldData.notes !== newData.notes) {
    const oldLength = (oldData.notes || '').length;
    const newLength = (newData.notes || '').length;
    
    if (!oldData.notes && newData.notes) {
      changes.push(`${entityName} — Notes: added (${newLength} characters)`);
    } else if (oldData.notes && !newData.notes) {
      changes.push(`${entityName} — Notes: removed (was ${oldLength} characters)`);
    } else {
      changes.push(`${entityName} — Notes: updated (${oldLength} → ${newLength} characters)`);
    }
  }

  return changes;
}

/**
 * Generate changes for reporting configuration
 */
/**
 * Generate changes for reporting configuration
 */
function generateReportingChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];

  // Normalize data to handle both full entity object and direct reporting object
  // Admin updates send full entity object (has .reporting property)
  // User updates send just the reporting object (does not have .reporting property)
  const oldReporting = oldData.reporting || oldData;
  const newReporting = newData.reporting || newData;

  // Verify we have valid reporting objects
  if (!oldReporting || !newReporting) {
    return changes;
  }

  const oldCategories = oldReporting.parentCategories || [];
  const newCategories = newReporting.parentCategories || [];

  // Compare each category
  for (let i = 0; i < Math.max(oldCategories.length, newCategories.length); i++) {
    const oldCat = oldCategories[i];
    const newCat = newCategories[i];

    if (!oldCat && newCat) {
      changes.push(`${entityName} — Added category: ${newCat.name}`);
    } else if (oldCat && !newCat) {
      changes.push(`${entityName} — Removed category: ${oldCat.name}`);
    } else if (oldCat && newCat) {
      const categoryName = newCat.name.replace(' REPORTING', '').replace(' Configuration', '');
      
      // Compare profiles/sessions
      const oldProfiles = oldCat.profiles || [];
      const newProfiles = newCat.profiles || [];

      for (let j = 0; j < Math.max(oldProfiles.length, newProfiles.length); j++) {
        const oldProfile = oldProfiles[j];
        const newProfile = newProfiles[j];

        if (!oldProfile && newProfile) {
          changes.push(`${entityName} — ${categoryName} — Added session: ${newProfile.profileName}`);
        } else if (oldProfile && !newProfile) {
          changes.push(`${entityName} — ${categoryName} — Removed session: ${oldProfile.profileName}`);
        } else if (oldProfile && newProfile) {
          // Profile Name
          if (oldProfile.profileName !== newProfile.profileName) {
            changes.push(`${entityName} — ${categoryName} — Session renamed from "${oldProfile.profileName}" to "${newProfile.profileName}"`);
          }
          
          // IP Address
          if (oldProfile.ip !== newProfile.ip) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: IP changed from "${oldProfile.ip}" to "${newProfile.ip}"`);
          }
          
          // Username
          if (oldProfile.username !== newProfile.username) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: username changed from "${oldProfile.username}" to "${newProfile.username}"`);
          }
          
          // Password
          if (oldProfile.password !== newProfile.password) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: password updated`);
          }
          
          // Connected
          if (oldProfile.connected !== newProfile.connected) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: connected changed from ${oldProfile.connected} to ${newProfile.connected}`);
          }
          
          // Blocked
          if (oldProfile.blocked !== newProfile.blocked) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: blocked changed from ${oldProfile.blocked} to ${newProfile.blocked}`);
          }
          
          // Mirror status
          if (oldProfile.isMirror !== newProfile.isMirror) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: mirror status changed from ${oldProfile.isMirror} to ${newProfile.isMirror}`);
          }
          
          // Mirror number
          if (oldProfile.mirrorNumber !== newProfile.mirrorNumber) {
            changes.push(`${entityName} — ${categoryName} — Session ${newProfile.profileName}: mirror number changed from ${oldProfile.mirrorNumber} to ${newProfile.mirrorNumber}`);
          }
        }
      }

      // Compare plan configuration
      if (oldCat.planConfiguration && newCat.planConfiguration) {
        const oldPlan = oldCat.planConfiguration;
        const newPlan = newCat.planConfiguration;

        // Drops (Seeds in drop)
        if (oldPlan.drops && newPlan.drops) {
          const oldDrops = oldPlan.drops;
          const newDrops = newPlan.drops;
          
          if (oldDrops.length !== newDrops.length) {
             changes.push(`${entityName} — ${categoryName} — Number of drops changed from ${oldDrops.length} to ${newDrops.length}`);
          }
          
          for (let k = 0; k < Math.max(oldDrops.length, newDrops.length); k++) {
            const oldDrop = oldDrops[k];
            const newDrop = newDrops[k];
            
            if (oldDrop && newDrop && oldDrop.value !== newDrop.value) {
              changes.push(`${entityName} — ${categoryName} — Drop ${k + 1} (Seeds): updated from ${oldDrop.value} to ${newDrop.value}`);
            }
          }
        }
        
        // Mode
        if (oldPlan.mode !== newPlan.mode) {
          changes.push(`${entityName} — ${categoryName} — Mode: changed from "${oldPlan.mode}" to "${newPlan.mode}"`);
        }
        
        // Status
        if (oldPlan.status !== newPlan.status) {
          changes.push(`${entityName} — ${categoryName} — Status: changed from "${oldPlan.status}" to "${newPlan.status}"`);
        }
        
        // Time Config
        if (oldPlan.timeConfig && newPlan.timeConfig) {
          if (oldPlan.timeConfig.startTime !== newPlan.timeConfig.startTime) {
            changes.push(`${entityName} — ${categoryName} — Start Time: changed from "${oldPlan.timeConfig.startTime}" to "${newPlan.timeConfig.startTime}"`);
          }
          if (oldPlan.timeConfig.endTime !== newPlan.timeConfig.endTime) {
            changes.push(`${entityName} — ${categoryName} — End Time: changed from "${oldPlan.timeConfig.endTime}" to "${newPlan.timeConfig.endTime}"`);
          }
        }
        
        // Script Name
        if (oldPlan.scriptName !== newPlan.scriptName) {
          changes.push(`${entityName} — ${categoryName} — Script Name: changed from "${oldPlan.scriptName}" to "${newPlan.scriptName}"`);
        }
        
        // Scenario
        if (oldPlan.scenario !== newPlan.scenario) {
          changes.push(`${entityName} — ${categoryName} — Scenario: changed from "${oldPlan.scenario}" to "${newPlan.scenario}"`);
        }
      }

      // Compare mirror table names
      if (oldCat.mirrorTableNames && newCat.mirrorTableNames) {
        const oldMirrorNames = oldCat.mirrorTableNames || {};
        const newMirrorNames = newCat.mirrorTableNames || {};
        
        const allKeys = new Set([...Object.keys(oldMirrorNames), ...Object.keys(newMirrorNames)]);
        for (const key of allKeys) {
          if (oldMirrorNames[key] !== newMirrorNames[key]) {
            changes.push(`${entityName} — ${categoryName} — Mirror table "${key}": renamed from "${oldMirrorNames[key]}" to "${newMirrorNames[key]}"`);
          }
        }
      }
    }
  }

  return changes;
}

/**
 * Generate changes for limits configuration
 */
function generateLimitsChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];

  if (oldData.limitsConfiguration && newData.limitsConfiguration) {
    const oldLimits = oldData.limitsConfiguration || [];
    const newLimits = newData.limitsConfiguration || [];

    // Create maps for easier comparison
    const oldLimitsMap = new Map(oldLimits.map((l: any) => [l.profileName, l]));
    const newLimitsMap = new Map(newLimits.map((l: any) => [l.profileName, l]));

    // Compare each session's limits
    for (const [profileName, newLimit] of newLimitsMap) {
      const oldLimit = oldLimitsMap.get(profileName);

      if (!oldLimit) {
        changes.push(`${entityName} — Limits — Added configuration for session: ${profileName}`);
      } else {
        const nl = newLimit as any;
        const ol = oldLimit as any;
        
        // Limit Active Session (Interval Quality)
        if (ol.limitActiveSession !== nl.limitActiveSession) {
          changes.push(`${entityName} — Interval Quality — Session ${profileName}: updated from ${ol.limitActiveSession} to ${nl.limitActiveSession}`);
        }
        
        // Intervals In Repo
        if (ol.intervalsInRepo !== nl.intervalsInRepo) {
          changes.push(`${entityName} — Intervals In Repo — Session ${profileName}: updated from "${ol.intervalsInRepo}" to "${nl.intervalsInRepo}"`);
        }
        
        // Intervals Quality
        if (ol.intervalsQuality !== nl.intervalsQuality) {
          changes.push(`${entityName} — Intervals Quality — Session ${profileName}: updated from "${ol.intervalsQuality}" to "${nl.intervalsQuality}"`);
        }
        
        // Intervals Paused Search
        if (ol.intervalsPausedSearch !== nl.intervalsPausedSearch) {
          changes.push(`${entityName} — Intervals Paused Search — Session ${profileName}: updated from "${ol.intervalsPausedSearch}" to "${nl.intervalsPausedSearch}"`);
        }
      }
    }

    // Check for removed limits
    for (const [profileName] of oldLimitsMap) {
      if (!newLimitsMap.has(profileName)) {
        changes.push(`${entityName} — Limits — Removed configuration for session: ${profileName}`);
      }
    }
  }

  return changes;
}

/**
 * Generate generic changes for any unhandled fields
 */
function generateGenericChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];
  
  // Get all top-level keys
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  for (const key of allKeys) {
    // Skip internal fields
    if (['updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'id'].includes(key)) {
      continue;
    }

    const oldVal = oldData[key];
    const newVal = newData[key];
    
    // Skip if values are the same
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
      continue;
    }
    
    // Handle different types
    if (typeof oldVal === 'object' && typeof newVal === 'object') {
      // For objects/arrays, just note that they changed
      if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        if (oldVal.length !== newVal.length) {
          changes.push(`${entityName} — ${key}: array size changed from ${oldVal.length} to ${newVal.length} items`);
        } else {
          changes.push(`${entityName} — ${key}: array items updated`);
        }
      } else {
        changes.push(`${entityName} — ${key}: configuration updated`);
      }
    } else if (oldVal !== newVal) {
      // Simple value change
      changes.push(`${entityName} — ${key}: changed from "${oldVal}" to "${newVal}"`);
    }
  }
  
  return changes;
}

/**
 * Generate changes for Day Plan configuration
 */
function generateDayPlanChanges(entityName: string, oldData: any, newData: any): string[] {
  const changes: string[] = [];
  
  // Parse sessionData if it's a string
  const oldSessionData = typeof oldData.sessionData === 'string' ? JSON.parse(oldData.sessionData) : oldData.sessionData || {};
  const newSessionData = typeof newData.sessionData === 'string' ? JSON.parse(newData.sessionData) : newData.sessionData || {};

  const allSessionIndices = new Set([...Object.keys(oldSessionData), ...Object.keys(newSessionData)]);
  
  let hasChanges = false;

  for (const idx of allSessionIndices) {
    const oldSession = oldSessionData[idx] || {};
    const newSession = newSessionData[idx] || {};
    
    // Check Step
    if (oldSession.step !== newSession.step) {
      changes.push(`${entityName} — Session #${parseInt(idx) + 1}: Step changed from ${oldSession.step || 0} to ${newSession.step}`);
      hasChanges = true;
    }
    
    // Check Start
    if (oldSession.start !== newSession.start) {
      changes.push(`${entityName} — Session #${parseInt(idx) + 1}: Start changed from ${oldSession.start || 0} to ${newSession.start}`);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    changes.push(`${entityName} — Plan applied`);
  }

  return changes;
}
