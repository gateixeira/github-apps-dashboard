import { useReducer, useCallback } from 'react';

interface AuditProgress {
  checked: number;
  total: number;
  found: number;
}

export interface AppState {
  token: string;
  enterpriseUrl: string;
  isConnected: boolean;
  selectedOrg: string;
  inactiveDays: number;
  isFirstLoad: boolean;
  usageLoadingStarted: boolean;
  smoothedAuditProgress: AuditProgress;
  usageRefreshKey: number;
}

type AppAction =
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'SET_ENTERPRISE_URL'; payload: string }
  | { type: 'SET_SELECTED_ORG'; payload: string }
  | { type: 'SET_INACTIVE_DAYS'; payload: number }
  | { type: 'CONNECT' }
  | { type: 'RECONNECT' }
  | { type: 'FIRST_LOAD_COMPLETE' }
  | { type: 'USAGE_LOADING_STARTED' }
  | { type: 'UPDATE_AUDIT_PROGRESS'; payload: AuditProgress }
  | { type: 'RESET_AUDIT_PROGRESS' };

const initialState: AppState = {
  token: '',
  enterpriseUrl: '',
  isConnected: false,
  selectedOrg: '',
  inactiveDays: 90,
  isFirstLoad: true,
  usageLoadingStarted: false,
  smoothedAuditProgress: { checked: 0, total: 0, found: 0 },
  usageRefreshKey: 0,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_ENTERPRISE_URL':
      return { ...state, enterpriseUrl: action.payload };
    case 'SET_SELECTED_ORG':
      return { ...state, selectedOrg: action.payload };
    case 'SET_INACTIVE_DAYS':
      return { ...state, inactiveDays: action.payload };
    case 'CONNECT':
      return { ...state, isConnected: true };
    case 'RECONNECT':
      return {
        ...state,
        usageRefreshKey: state.usageRefreshKey + 1,
        isFirstLoad: true,
        usageLoadingStarted: false,
      };
    case 'FIRST_LOAD_COMPLETE':
      return { ...state, isFirstLoad: false, usageLoadingStarted: false };
    case 'USAGE_LOADING_STARTED':
      return { ...state, usageLoadingStarted: true };
    case 'UPDATE_AUDIT_PROGRESS':
      return {
        ...state,
        smoothedAuditProgress: {
          checked: Math.max(state.smoothedAuditProgress.checked, action.payload.checked),
          total: Math.max(state.smoothedAuditProgress.total, action.payload.total),
          found: Math.max(state.smoothedAuditProgress.found, action.payload.found),
        },
      };
    case 'RESET_AUDIT_PROGRESS':
      return { ...state, smoothedAuditProgress: { checked: 0, total: 0, found: 0 } };
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setToken = useCallback((token: string) => dispatch({ type: 'SET_TOKEN', payload: token }), []);
  const setEnterpriseUrl = useCallback((url: string) => dispatch({ type: 'SET_ENTERPRISE_URL', payload: url }), []);
  const setSelectedOrg = useCallback((org: string) => dispatch({ type: 'SET_SELECTED_ORG', payload: org }), []);
  const setInactiveDays = useCallback((days: number) => dispatch({ type: 'SET_INACTIVE_DAYS', payload: days }), []);

  return { state, dispatch, setToken, setEnterpriseUrl, setSelectedOrg, setInactiveDays };
}
