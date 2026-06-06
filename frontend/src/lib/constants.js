export const DEPARTMENTS = [
  'HK', 'Maintenance', 'Canteen', 'OPD', 'Reception', 'OT',
  'IPD', 'IPD-MA', 'HR', 'Finance & Billing', 'Accounting',
  'Telecaller', 'Pharmacy', 'Marketing', 'Quality', 'MRD'
];

export const CATEGORIES = ['Minor', 'Major', 'Critical'];

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUSES = ['Open', 'Closed', 'Pending'];

export const IMPACT_CATEGORIES = ['Safety', 'Reputational', 'Operational', 'Compliance', 'Finance'];

export const SENSITISATION_OPTIONS = ['Immediate Hospitalwide (Standing Meeting)', 'Discussion in Department'];

export const EVENT_TYPES = ['Near Miss', 'No Harm', 'Adverse Event', 'Sentinel Event'];

export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'dept_head', label: 'Department Head' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
];

export const SEVERITY_COLORS = {
  Critical: { bg: '#dc2626', text: '#fff' },
  High: { bg: '#ea580c', text: '#fff' },
  Medium: { bg: '#ca8a04', text: '#fff' },
  Low: { bg: '#16a34a', text: '#fff' },
};

export const STATUS_COLORS = {
  Open: { bg: '#dbeafe', text: '#1e40af' },
  Closed: { bg: '#d1fae5', text: '#065f46' },
  Pending: { bg: '#fef3c7', text: '#92400e' },
};

export const ROLE_COLORS = {
  admin: { bg: '#ede9fe', text: '#5b21b6' },
  dept_head: { bg: '#dbeafe', text: '#1e40af' },
  staff: { bg: '#d1fae5', text: '#065f46' },
  viewer: { bg: '#f3f4f6', text: '#374151' },
};
