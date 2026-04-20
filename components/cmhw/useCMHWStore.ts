
import { create } from 'zustand';

interface Entity {
  id: number;
  name: string;
  plans?: any[];
  reporting_types?: any[];
}

interface CMHWState {
  currentUser: any;
  entities: Entity[];
  selectedListsEntityId: number | null;
  activeSection: string;
  
  setCurrentUser: (user: any) => void;
  setEntities: (entities: Entity[]) => void;
  setSelectedListsEntityId: (id: number | null) => void;
  setActiveSection: (section: string) => void;
}

export const useCMHWStore = create<CMHWState>((set) => ({
  currentUser: null,
  entities: [],
  selectedListsEntityId: null,
  activeSection: 'lists',

  setCurrentUser: (user) => set({ currentUser: user }),
  setEntities: (entities) => {
    // Sort entities numerically by extracting number from name
    const sorted = [...entities].sort((a, b) => {
      const numA = parseInt(String(a.name || '').replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.name || '').replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    set({ entities: sorted });
  },
  setSelectedListsEntityId: (id) => set({ selectedListsEntityId: id }),
  setActiveSection: (section) => set({ activeSection: section }),
}));
