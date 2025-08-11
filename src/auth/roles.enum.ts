export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  CUSTOMER = 'customer',
  GUEST = 'guest',
  SCANNER_STAFF = 'scanner_staff', // For QR code scanning
  BOX_OFFICE = 'box_office', // For ticket sales
  SECURITY = 'security', // For event security
  MANAGER = 'manager', // For business management
}

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
  SUPER = 'super',
}

export enum QRPermission {
  GENERATE = 'qr:generate',
  VALIDATE = 'qr:validate',
  VIEW_STATS = 'qr:view_stats',
  ADMIN_VALIDATE = 'qr:admin_validate',
  BULK_GENERATE = 'qr:bulk_generate',
}
