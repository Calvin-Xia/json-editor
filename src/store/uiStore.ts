import { create } from 'zustand';

interface UIStore {
  sidebarWidth: number;
  isSearchVisible: boolean;
  searchQuery: string;
  selectedNodeId: string | null;
  setSidebarWidth: (width: number) => void;
  setSearchVisible: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarWidth: 280,
  isSearchVisible: false,
  searchQuery: '',
  selectedNodeId: null,

  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSearchVisible: (visible) => set({ isSearchVisible: visible }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
}));
