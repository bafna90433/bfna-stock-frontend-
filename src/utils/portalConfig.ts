export type PortalType = 'admin' | 'staff' | 'dispatch' | 'billing' | 'stock' | 'all';

export interface PortalConfig {
  type: PortalType;
  label: string;
  subtitle: string;
  role: string | null;        // null = any role allowed (main domain)
  defaultRedirect: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const CONFIGS: Record<string, PortalConfig> = {
  'staff': {
    type: 'staff',
    label: 'Staff Portal',
    subtitle: 'Sales & Order Management',
    role: 'sale_staff',
    defaultRedirect: '/sale-staff/dashboard',
    accentColor: '#EF4444',
    gradientFrom: '#EF4444',
    gradientTo: '#F97316',
  },
  'dispatch': {
    type: 'dispatch',
    label: 'Dispatch Portal',
    subtitle: 'Logistics & Dispatch Management',
    role: 'dispatch',
    defaultRedirect: '/dispatch/dashboard',
    accentColor: '#06B6D4',
    gradientFrom: '#06B6D4',
    gradientTo: '#10B981',
  },
  'billing': {
    type: 'billing',
    label: 'Billing Portal',
    subtitle: 'Finance & Invoice Management',
    role: 'billing',
    defaultRedirect: '/billing/dashboard',
    accentColor: '#F59E0B',
    gradientFrom: '#F59E0B',
    gradientTo: '#EF4444',
  },
  'stock': {
    type: 'stock',
    label: 'Stock Portal',
    subtitle: 'Inventory Management',
    role: 'stock_manager',
    defaultRedirect: '/stock-manager/dashboard',
    accentColor: '#10B981',
    gradientFrom: '#10B981',
    gradientTo: '#3B82F6',
  },
};

const DEFAULT_CONFIG: PortalConfig = {
  type: 'all',
  label: 'Admin Portal',
  subtitle: 'Complete Stock Management',
  role: null,
  defaultRedirect: '/admin/dashboard',
  accentColor: '#6366F1',
  gradientFrom: '#6366F1',
  gradientTo: '#8B5CF6',
};

export function getPortalConfig(): PortalConfig {
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0].toLowerCase();
  return CONFIGS[subdomain] ?? DEFAULT_CONFIG;
}

/** After login, check if user's role is allowed on this portal */
export function isRoleAllowedOnPortal(userRole: string, config: PortalConfig): boolean {
  if (userRole === 'admin') return true;          // Admin can go anywhere
  if (config.role === null) return true;           // Main domain allows all
  return userRole === config.role;
}

/** Get correct redirect path after login */
export function getLoginRedirect(userRole: string, config: PortalConfig): string {
  if (userRole === 'admin') return '/admin/dashboard';
  if (userRole === 'checking') return '/checking/dashboard';
  return config.defaultRedirect;
}
