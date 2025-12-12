import React, { useState, useEffect } from 'react';
import { Entity, PlanConfiguration, ParentCategory } from '../../types';
import { Clock, RefreshCw, Plus, Edit2, Trash2, ChevronDown, X, Settings } from 'lucide-react';
import { service } from '../../services';
import { Button } from '../ui/Button';
import { scriptsService, Script, Scenario } from '../../services/scriptsService';

interface Props {
  entity: Entity;
  category: ParentCategory;
  onUpdate: () => void;
}

// Helper: Parse string ranges into array of [start, end]
const parseRanges = (str: string): [number, number][] => {
  if (!str || typeof str !== 'string') return [];
  if (str.trim().toUpperCase() === 'NO') return [];

  const ranges: [number, number][] = [];
  const parts = str.split(',');

  parts.forEach(part => {
    const p = part.trim();
    if (!p || p.toUpperCase() === 'NO') return;

    if (p.includes('-')) {
      const [start, end] = p.split('-').map(s => parseInt(s.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        ranges.push([Math.min(start, end), Math.max(start, end)]);
      }
    } else {
      const val = parseInt(p);
      if (!isNaN(val)) ranges.push([val, val]);
    }
  });
  return ranges;
};

// Helper: Calculate the complement of intervals within a given range
const calculateIntervalComplement = (totalRange: string, excludedIntervals: string[]): string => {
  const totalRanges = parseRanges(totalRange);
  if (totalRanges.length === 0) return '';

  let allExcluded: [number, number][] = [];
  excludedIntervals.forEach(interval => {
    allExcluded = allExcluded.concat(parseRanges(interval));
  });

  if (allExcluded.length === 0) {
    return totalRange;
  }

  allExcluded.sort((a, b) => a[0] - b[0]);
  const mergedExcluded: [number, number][] = [];
  let current = allExcluded[0];

  for (let i = 1; i < allExcluded.length; i++) {
    const next = allExcluded[i];
    if (next[0] <= current[1] + 1) {
      current[1] = Math.max(current[1], next[1]);
    } else {
      mergedExcluded.push(current);
      current = next;
    }
  }
  mergedExcluded.push(current);

  const complementRanges: [number, number][] = [];

  totalRanges.forEach(([start, end]) => {
    let currentStart = start;

    mergedExcluded.forEach(([exStart, exEnd]) => {
      if (exEnd < currentStart) return;
      if (exStart > end) return;

      if (currentStart < exStart) {
        complementRanges.push([currentStart, Math.min(exStart - 1, end)]);
      }

      currentStart = Math.max(currentStart, exEnd + 1);
    });

    if (currentStart <= end) {
      complementRanges.push([currentStart, end]);
    }
  });

  if (complementRanges.length === 0) return '';

  return complementRanges.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(',');
};

import { useAuth } from '../../contexts/AuthContext';

export const PlanConfig: React.FC<Props> = ({ entity, category, onUpdate }) => {
  const { user } = useAuth();
  // User, Admin, and Mailer can all edit the reporting plan
  const canEdit = true;
  const [config, setConfig] = useState<PlanConfiguration>(category.planConfiguration);
  const [saving, setSaving] = useState(false);
  const [numDropsInput, setNumDropsInput] = useState<number>(category.planConfiguration.drops.length);
  const [bulkSeedValue, setBulkSeedValue] = useState<string>('');

  // Script & Scenario state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(false);

  // Admin modal state
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [modalScriptName, setModalScriptName] = useState('');
  const [modalScriptDescription, setModalScriptDescription] = useState('');
  const [modalScenarioName, setModalScenarioName] = useState('');
  const [modalScenarioDescription, setModalScenarioDescription] = useState('');
  const [modalScenarioScriptId, setModalScenarioScriptId] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // Sync state if category changes
  useEffect(() => {
    setConfig({
      ...category.planConfiguration,
      status: category.planConfiguration.status || 'active',
      mode: category.planConfiguration.mode || 'auto'
    });
    setNumDropsInput(category.planConfiguration.drops.length);
  }, [category]);

  // Load scripts on mount
  useEffect(() => {
    loadScripts();
  }, []);

  // When scripts are loaded and config has a scriptName, try to find and select it
  useEffect(() => {
    const loadInitialSelection = async () => {
      if (scripts.length > 0 && config.scriptName) {
        const matchingScript = scripts.find(s => s.name === config.scriptName);
        if (matchingScript && selectedScriptId !== matchingScript.id) {
          setSelectedScriptId(matchingScript.id);

          // Fetch scenarios from API
          try {
            const fetchedScenarios = await scriptsService.getScenariosByScript(matchingScript.id);
            setScenarios(fetchedScenarios);

            // If there's a scenario name in config, try to select it
            if (config.scenario && fetchedScenarios.length > 0) {
              const matchingScenario = fetchedScenarios.find(sc => sc.name === config.scenario);
              if (matchingScenario) {
                setSelectedScenarioId(matchingScenario.id);
              }
            }
          } catch (error) {
            console.error('Failed to load scenarios for initial selection:', error);
          }
        }
      }
    };

    loadInitialSelection();
  }, [scripts, config.scriptName]);

  const loadScripts = async () => {
    setLoadingScripts(true);
    try {
      const data = await scriptsService.getScripts();
      setScripts(data);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoadingScripts(false);
    }
  };

  const loadScenariosByScript = async (scriptId: string) => {
    setLoadingScenarios(true);
    try {
      const data = await scriptsService.getScenariosByScript(scriptId);
      setScenarios(data);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoadingScenarios(false);
    }
  };

  // --- Handlers ---

  const handleDropChange = (id: string, value: string) => {
    const numVal = parseInt(value);
    setConfig(prev => ({
      ...prev,
      drops: prev.drops.map(d => d.id === id ? { ...d, value: isNaN(numVal) ? 0 : numVal } : d)
    }));
  };

  const handleNumDropsChange = (newCount: number) => {
    if (newCount < 0) return;
    setNumDropsInput(newCount);

    setConfig(prev => {
      const currentDrops = [...prev.drops];
      const diff = newCount - currentDrops.length;

      if (diff > 0) {
        // Add drops
        for (let i = 0; i < diff; i++) {
          currentDrops.push({ id: `drop_${Date.now()}_${i}`, value: 0 });
        }
      } else if (diff < 0) {
        // Remove drops from end
        currentDrops.splice(diff);
      }
      return { ...prev, drops: currentDrops };
    });
  };

  const handleTimeChange = (value: string) => {
    setConfig(prev => ({
      ...prev,
      timeConfig: { ...prev.timeConfig, startTime: value }
    }));
  };

  const handleBulkSet = () => {
    const val = parseInt(bulkSeedValue);
    if (!isNaN(val)) {
      setConfig(prev => ({
        ...prev,
        drops: prev.drops.map(d => ({ ...d, value: val }))
      }));
    }
  };

  // Handle Script Selection - auto-load scenarios
  const handleScriptSelect = async (scriptId: string) => {
    setSelectedScriptId(scriptId);
    setSelectedScenarioId(''); // Reset scenario selection
    setScenarios([]); // Clear scenarios while loading

    if (!scriptId) {
      setConfig(prev => ({ ...prev, scriptName: '', scenario: '' }));
      return;
    }

    const selectedScript = scripts.find(s => s.id === scriptId);
    if (selectedScript) {
      setConfig(prev => ({ ...prev, scriptName: selectedScript.name }));

      // Fetch scenarios from API for this script
      setLoadingScenarios(true);
      try {
        const fetchedScenarios = await scriptsService.getScenariosByScript(scriptId);
        setScenarios(fetchedScenarios);

        // Auto-select first scenario if available
        if (fetchedScenarios && fetchedScenarios.length > 0) {
          const firstScenario = fetchedScenarios[0];
          setSelectedScenarioId(firstScenario.id);
          setConfig(prev => ({ ...prev, scenario: firstScenario.name }));
        } else {
          setConfig(prev => ({ ...prev, scenario: '' }));
        }
      } catch (error) {
        console.error('Failed to fetch scenarios:', error);
        setConfig(prev => ({ ...prev, scenario: '' }));
      } finally {
        setLoadingScenarios(false);
      }
    } else {
      setConfig(prev => ({ ...prev, scriptName: '', scenario: '' }));
    }
  };

  // Handle Scenario Selection - auto-load script
  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);

    const selectedScenario = scenarios.find(s => s.id === scenarioId);
    if (selectedScenario) {
      setConfig(prev => ({ ...prev, scenario: selectedScenario.name }));

      // Auto-select the parent script if not already selected
      if (selectedScenario.script && selectedScenario.script.id !== selectedScriptId) {
        setSelectedScriptId(selectedScenario.script.id);
        setConfig(prev => ({ ...prev, scriptName: selectedScenario.script!.name }));
      }
    } else {
      setConfig(prev => ({ ...prev, scenario: '' }));
    }
  };

  // Admin CRUD handlers for Scripts
  const openScriptModal = (script?: Script) => {
    if (script) {
      setEditingScript(script);
      setModalScriptName(script.name);
      setModalScriptDescription(script.description || '');
    } else {
      setEditingScript(null);
      setModalScriptName('');
      setModalScriptDescription('');
    }
    setShowScriptModal(true);
  };

  const handleSaveScript = async () => {
    if (!modalScriptName.trim()) return;

    setModalSaving(true);
    try {
      if (editingScript) {
        await scriptsService.updateScript(editingScript.id, {
          name: modalScriptName.trim(),
          description: modalScriptDescription.trim() || undefined
        });
      } else {
        await scriptsService.createScript({
          name: modalScriptName.trim(),
          description: modalScriptDescription.trim() || undefined
        });
      }
      await loadScripts();
      setShowScriptModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to save script');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (!confirm('Are you sure you want to delete this script and all its scenarios?')) return;

    try {
      await scriptsService.deleteScript(scriptId);
      await loadScripts();
      if (selectedScriptId === scriptId) {
        setSelectedScriptId('');
        setSelectedScenarioId('');
        setScenarios([]);
        setConfig(prev => ({ ...prev, scriptName: '', scenario: '' }));
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete script');
    }
  };

  // Admin CRUD handlers for Scenarios
  const openScenarioModal = (scenario?: Scenario) => {
    if (scenario) {
      setEditingScenario(scenario);
      setModalScenarioName(scenario.name);
      setModalScenarioDescription(scenario.description || '');
      setModalScenarioScriptId(scenario.scriptId);
    } else {
      setEditingScenario(null);
      setModalScenarioName('');
      setModalScenarioDescription('');
      setModalScenarioScriptId(selectedScriptId);
    }
    setShowScenarioModal(true);
  };

  const handleSaveScenario = async () => {
    if (!modalScenarioName.trim() || !modalScenarioScriptId) return;

    setModalSaving(true);
    try {
      if (editingScenario) {
        await scriptsService.updateScenario(editingScenario.id, {
          name: modalScenarioName.trim(),
          description: modalScenarioDescription.trim() || undefined,
          scriptId: modalScenarioScriptId
        });
      } else {
        await scriptsService.createScenario({
          name: modalScenarioName.trim(),
          scriptId: modalScenarioScriptId,
          description: modalScenarioDescription.trim() || undefined
        });
      }
      await loadScripts();
      // Reload scenarios for the current script
      if (selectedScriptId) {
        const updatedScript = scripts.find(s => s.id === selectedScriptId);
        if (updatedScript) {
          await loadScenariosByScript(selectedScriptId);
        }
      }
      setShowScenarioModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to save scenario');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return;

    try {
      await scriptsService.deleteScenario(scenarioId);
      await loadScripts();
      if (selectedScriptId) {
        await loadScenariosByScript(selectedScriptId);
      }
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId('');
        setConfig(prev => ({ ...prev, scenario: '' }));
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete scenario');
    }
  };

  const handleStatusChange = (newStatus: 'active' | 'stopped') => {
    setConfig(prev => ({ ...prev, status: newStatus }));
  };

  const handleModeChange = (newMode: 'auto' | 'request') => {
    setConfig(prev => ({ ...prev, mode: newMode }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Deep copy entity to update nested category
    const updatedEntity = JSON.parse(JSON.stringify(entity)) as Entity;
    const catIndex = updatedEntity.reporting.parentCategories.findIndex(c => c.id === category.id);

    if (catIndex >= 0) {
      updatedEntity.reporting.parentCategories[catIndex].planConfiguration = config;
      await service.saveEntity(updatedEntity);
      window.dispatchEvent(new Event('entity-updated'));
    }

    setSaving(false);
    onUpdate();
  };

  // --- Calculations ---

  const calculateDropTime = (startTime: string, index: number): string => {
    if (!startTime) return '--:--';
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return startTime;

    let newH = (h + index) % 24;
    return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const totalPerDay = config.drops.reduce((sum, d) => sum + (d.value || 0), 0);

  // Calculate Total Seeds Connected specifically for this category's limits
  // Total Seeds Connected = Sum of all INTERVALS IN REPO (Principal sessions only)
  const calculateTotalSeedsConnected = (): number => {
    if (!entity.limitsConfiguration) return 0;

    // Filter to only include principal sessions (exclude mirrors)
    const principalProfiles = category.profiles.filter(p => !p.isMirror);

    return principalProfiles.reduce((sum, profile) => {
      // Find effective limit for this profile in this category
      let limit = entity.limitsConfiguration.find(l => l.profileName === profile.profileName && l.categoryId === category.id);
      if (!limit) {
        limit = entity.limitsConfiguration.find(l => l.profileName === profile.profileName && !l.categoryId);
      }

      if (!limit) return sum;

      // Calculate intervalsInRepo on-the-fly if not present
      let intervalsInRepo = limit.intervalsInRepo || '';

      if (!intervalsInRepo) {
        // Calculate it from the other fields
        intervalsInRepo = calculateIntervalComplement(
          limit.limitActiveSession,
          [limit.intervalsQuality, limit.intervalsPausedSearch, limit.intervalsToxic, limit.intervalsOther]
        );
      }

      const parts = intervalsInRepo.split(',');
      let limitSum = 0;
      parts.forEach(p => {
        const trimmed = p.trim();
        if (trimmed.toUpperCase() === 'NO' || !trimmed) return;
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end)) limitSum += (end - start + 1);
        } else {
          const val = parseInt(trimmed);
          if (!isNaN(val)) limitSum += 1; // Single value counts as 1
        }
      });
      return sum + limitSum;
    }, 0);
  };

  const totalSeedsConnected = calculateTotalSeedsConnected();
  // Rotation calculation: Total seeds connected / Total per day
  const rotation = totalPerDay > 0 ? (totalSeedsConnected / totalPerDay).toFixed(2) : '0.00';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${config.status === 'stopped' ? 'bg-red-300 border-red-00' : 'bg-blue-50 border-blue-100'}`}>
        <h3 className={`text-lg font-bold ${config.status === 'stopped' ? 'text-white' : 'text-gray-800'}`}>Reporting Plan ({category.name})</h3>
      </div>

      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left Panel: Drops List */}
          <div className="flex-1 w-full">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto bg-white">
                <div className="grid grid-cols-3 bg-slate-100 text-xs font-bold text-gray-500 uppercase border-b border-gray-300 sticky top-0 z-10">
                  <div className="py-3 px-4 border-r border-gray-300 bg-slate-100">N° Drop</div>
                  <div className="py-3 px-4 border-r border-gray-300 bg-slate-100">Time</div>
                  <div className="py-3 px-4 bg-slate-100">Seeds in drop</div>
                </div>
                {config.drops.map((drop, index) => (
                  <div key={drop.id} className="grid grid-cols-3 border-b border-gray-300 last:border-0 hover:bg-gray-50 transition-colors">
                    <div className="text-sm font-medium text-gray-700 border-r border-gray-300 py-1 px-4 flex items-center">drop {index + 1}</div>
                    <div className="text-sm text-gray-500 border-r border-gray-300 py-1 px-4 flex items-center">
                      {config.mode === 'request' && category.name.toLowerCase().includes('offer') ? 'REQUEST' : calculateDropTime(config.timeConfig.startTime, index)}
                    </div>
                    <div className="py-1 px-4">
                      <input
                        type="text"
                        value={drop.value || ''}
                        onChange={(e) => handleDropChange(drop.id, e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>
                  </div>
                ))}
                {config.drops.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">No drops configured for this category.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Configuration & Summary */}
          <div className="w-full lg:w-80 space-y-6">

            {/* Configuration Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-5">
              <h4 className="font-semibold text-gray-800">Configuration</h4>

              {category.name.toLowerCase().includes('offer') && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Mode</label>
                  <div className="flex bg-gray-100/50 p-1.5 rounded-xl border border-gray-200/50">
                    <button
                      onClick={() => handleModeChange('auto')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${config.mode === 'auto' || !config.mode
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                    >
                      AUTO
                    </button>
                    <button
                      onClick={() => handleModeChange('request')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${config.mode === 'request'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                    >
                      REQUEST
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Status</label>
                <div className="flex bg-gray-100/50 p-1.5 rounded-xl border border-gray-200/50">
                  <button
                    onClick={() => handleStatusChange('active')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${config.status === 'active'
                      ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    ACTIVE
                  </button>
                  <button
                    onClick={() => handleStatusChange('stopped')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${config.status === 'stopped'
                      ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    STOPED
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">N° Drops</label>
                <input
                  type="number"
                  value={numDropsInput}
                  onChange={(e) => handleNumDropsChange(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Start Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={config.timeConfig.startTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pr-8"
                  />
                  <Clock className="absolute right-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Seeds in drop</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bulkSeedValue}
                    onChange={(e) => setBulkSeedValue(e.target.value)}
                    placeholder="Set all..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleBulkSet}
                  >
                    Set All
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSave}
                isLoading={saving}
                className="w-full mt-4"
                leftIcon={!saving && <RefreshCw size={18} />}
              >
                Save Plan
              </Button>
            </div>

            {/* Summary Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3">
              <h4 className="font-semibold text-gray-800 mb-2">Summary</h4>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total per day:</span>
                <span className="font-bold text-gray-900">{totalPerDay}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total seeds connected:</span>
                <span className="font-bold text-green-600">{totalSeedsConnected}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Rotation:</span>
                <span className="font-bold text-gray-900">{rotation}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Script Configuration */}
        <div className="mt-8 border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <Settings size={16} className="text-gray-500" />
              Script Configuration
            </h4>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openScriptModal()}
                  leftIcon={<Plus size={14} />}
                >
                  Add Script
                </Button>
                {selectedScriptId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openScenarioModal()}
                    leftIcon={<Plus size={14} />}
                  >
                    Add Scenario
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Script Dropdown */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Script</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedScriptId}
                    onChange={(e) => handleScriptSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none appearance-none bg-white pr-8"
                    disabled={loadingScripts}
                  >
                    <option value="">-- Select Script --</option>
                    {scripts.map(script => (
                      <option key={script.id} value={script.id}>
                        {script.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {isAdmin && selectedScriptId && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const script = scripts.find(s => s.id === selectedScriptId);
                        if (script) openScriptModal(script);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Script"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(selectedScriptId)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Script"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {loadingScripts && (
                <p className="text-xs text-gray-400 mt-1">Loading scripts...</p>
              )}
            </div>
          </div>

          {/* Current selection display */}
          {(config.scriptName || config.scenario) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Current:</span>{' '}
                {config.scriptName && <span className="text-blue-900">{config.scriptName}</span>}
                {config.scriptName && config.scenario && <span className="text-blue-500"> → </span>}
                {config.scenario && <span className="text-blue-900">{config.scenario}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Script Modal */}
        {showScriptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingScript ? 'Edit Script' : 'Add New Script'}
                </h3>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Script Name</label>
                  <input
                    type="text"
                    value={modalScriptName}
                    onChange={(e) => setModalScriptName(e.target.value)}
                    placeholder="e.g., CMH1_Warmup_Script_v2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={modalScriptDescription}
                    onChange={(e) => setModalScriptDescription(e.target.value)}
                    placeholder="Enter script description..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <Button variant="ghost" onClick={() => setShowScriptModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveScript}
                  isLoading={modalSaving}
                  disabled={!modalScriptName.trim()}
                >
                  {editingScript ? 'Save Changes' : 'Create Script'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scenario Modal */}
        {showScenarioModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingScenario ? 'Edit Scenario' : 'Add New Scenario'}
                </h3>
                <button
                  onClick={() => setShowScenarioModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Script</label>
                  <select
                    value={modalScenarioScriptId}
                    onChange={(e) => setModalScenarioScriptId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                  >
                    <option value="">-- Select Script --</option>
                    {scripts.map(script => (
                      <option key={script.id} value={script.id}>
                        {script.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Name</label>
                  <input
                    type="text"
                    value={modalScenarioName}
                    onChange={(e) => setModalScenarioName(e.target.value)}
                    placeholder="e.g., Standard_Rotation_A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={modalScenarioDescription}
                    onChange={(e) => setModalScenarioDescription(e.target.value)}
                    placeholder="Enter scenario description..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <Button variant="ghost" onClick={() => setShowScenarioModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveScenario}
                  isLoading={modalSaving}
                  disabled={!modalScenarioName.trim() || !modalScenarioScriptId}
                >
                  {editingScenario ? 'Save Changes' : 'Create Scenario'}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Step/Session Table */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <RefreshCw size={16} className="text-gray-500" />
            Step / Session Calculation
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm border border-gray-300">
            <thead>
              <tr className="text-xs uppercase tracking-wider">
                <th className="py-3 px-6 text-left font-bold bg-gray-100 text-gray-700 border border-gray-300">Sessions of {category.name}</th>
                <th className="py-3 px-6 text-center font-bold bg-blue-100 text-blue-800 border border-gray-300">
                  Total Seeds<br />Active in Repo
                </th>
                <th className="py-3 px-6 text-center font-bold bg-indigo-100 text-indigo-800 border border-gray-300">
                  Step / Session
                </th>
                <th className="py-3 px-6 text-center font-bold bg-green-100 text-green-800 border border-gray-300">
                  Consommation<br />Sessions / Jour
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Filter to only include principal sessions (exclude mirrors)
                const principalProfiles = category.profiles.filter(p => !p.isMirror);
                const numDrops = config.drops.length || 1;

                // 1. Calculate Active Counts for all profiles first
                const profileData = principalProfiles.map(profile => {
                  let limit = entity.limitsConfiguration.find(l => l.profileName === profile.profileName && l.categoryId === category.id);
                  if (!limit) {
                    limit = entity.limitsConfiguration.find(l => l.profileName === profile.profileName && !l.categoryId);
                  }

                  let intervalsInRepo = limit?.intervalsInRepo || '';
                  if (!intervalsInRepo) {
                    intervalsInRepo = calculateIntervalComplement(
                      limit?.limitActiveSession || '',
                      [limit?.intervalsQuality || '', limit?.intervalsPausedSearch || '', limit?.intervalsToxic || '', limit?.intervalsOther || '']
                    );
                  }

                  const parts = intervalsInRepo.split(',');
                  let activeInRepoCount = 0;
                  parts.forEach(p => {
                    const trimmed = p.trim();
                    if (trimmed.toUpperCase() === 'NO' || !trimmed) return;
                    if (trimmed.includes('-')) {
                      const [start, end] = trimmed.split('-').map(Number);
                      if (!isNaN(start) && !isNaN(end)) activeInRepoCount += (end - start + 1);
                    } else {
                      const val = parseInt(trimmed);
                      if (!isNaN(val)) activeInRepoCount += 1;
                    }
                  });

                  return {
                    profile,
                    activeInRepoCount
                  };
                });

                const totalActiveInRepo = profileData.reduce((sum, p) => sum + p.activeInRepoCount, 0);

                // 2. Calculate Consommation with Largest Remainder Method to ensure exact total
                const targetTotalConsommation = totalPerDay;

                // Calculate raw values and remainders
                const calculatedData = profileData.map(p => {
                  const rawConsommation = totalActiveInRepo > 0
                    ? (p.activeInRepoCount * targetTotalConsommation) / totalActiveInRepo
                    : 0;
                  return {
                    ...p,
                    floorConsommation: Math.floor(rawConsommation),
                    fraction: rawConsommation - Math.floor(rawConsommation)
                  };
                });

                // Distribute remainder
                if (totalActiveInRepo > 0) {
                  const currentSum = calculatedData.reduce((sum, p) => sum + p.floorConsommation, 0);
                  const remainder = targetTotalConsommation - currentSum;

                  // Sort indices by fraction descending
                  const sortedIndices = calculatedData.map((_, i) => i)
                    .sort((a, b) => calculatedData[b].fraction - calculatedData[a].fraction);

                  // Add 1 to the top 'remainder' items
                  for (let i = 0; i < remainder; i++) {
                    calculatedData[sortedIndices[i]].floorConsommation += 1;
                  }
                }

                let totalStepPerSession = 0;
                let totalConsommation = 0;

                const rows = calculatedData.map((data) => {
                  const consommation = data.floorConsommation;
                  const stepPerSession = numDrops > 0 ? Math.round(consommation / numDrops) : 0;

                  totalStepPerSession += stepPerSession;
                  totalConsommation += consommation;

                  return (
                    <tr key={data.profile.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-6 text-gray-900 font-medium border border-gray-300">
                        {data.profile.profileName}
                      </td>
                      <td className="py-3 px-6 text-center text-gray-700 font-mono border border-gray-300">
                        {data.activeInRepoCount}
                      </td>
                      <td className="py-3 px-6 text-center border border-gray-300">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg text-sm">
                          {stepPerSession}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center border border-gray-300">
                        <span className="font-mono font-bold text-green-700 bg-green-100 px-3 py-1 rounded-lg text-sm">
                          {consommation}
                        </span>
                      </td>
                    </tr>
                  );
                });

                // Total Row
                rows.push(
                  <tr key="total" className="bg-gray-100 font-bold">
                    <td className="py-3 px-6 text-center text-gray-700 uppercase text-xs tracking-wider border border-gray-300">Total</td>
                    <td className="py-3 px-6 text-center text-gray-800 font-mono border border-gray-300">{totalActiveInRepo}</td>
                    <td className="py-3 px-6 text-center text-gray-800 font-mono border border-gray-300">{totalStepPerSession}</td>
                    <td className="py-3 px-6 text-center text-gray-800 font-mono border border-gray-300">{totalConsommation}</td>
                  </tr>
                );

                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};