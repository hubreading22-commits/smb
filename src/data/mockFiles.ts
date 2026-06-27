/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SMBFile } from '../types';

export const INITIAL_FILES: SMBFile[] = [
  // Top-level shares/folders
  {
    id: '1',
    name: 'Public_Share',
    path: 'Public_Share',
    type: 'folder',
    size: 0,
    updatedAt: '2026-06-25T14:30:00Z',
    owner: 'digihub\\administrator',
    permissions: { canRead: true, canWrite: true, canDelete: false, canRename: false }
  },
  {
    id: '2',
    name: 'Finance_Reports',
    path: 'Finance_Reports',
    type: 'folder',
    size: 0,
    updatedAt: '2026-06-24T09:15:00Z',
    owner: 'digihub\\finance_admin',
    permissions: { canRead: true, canWrite: false, canDelete: false, canRename: false } // Custom checked at runtime
  },
  {
    id: '3',
    name: 'IT_Infrastructure',
    path: 'IT_Infrastructure',
    type: 'folder',
    size: 0,
    updatedAt: '2026-06-26T17:45:00Z',
    owner: 'digihub\\john',
    permissions: { canRead: false, canWrite: false, canDelete: false, canRename: false } // Invisible or locked for non-admins
  },
  {
    id: '4',
    name: 'digihub_847_shared',
    path: 'digihub_847_shared',
    type: 'folder',
    size: 0,
    updatedAt: '2026-06-27T08:00:00Z',
    owner: 'digihub\\847',
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true }
  },

  // Files in Public_Share
  {
    id: '101',
    name: 'Office_Policy_2026.txt',
    path: 'Public_Share/Office_Policy_2026.txt',
    type: 'file',
    size: 4120,
    updatedAt: '2026-01-15T09:00:00Z',
    extension: 'txt',
    owner: 'digihub\\hr_manager',
    permissions: { canRead: true, canWrite: false, canDelete: false, canRename: false },
    content: `DIGIHUB OFFICE POLICIES - VERSION 2026.1

1. Working Hours: Core working hours are from 09:00 AM to 05:00 PM.
2. Network Usage: All systems must remain connected to the secure AD domain. Do not configure custom DNS.
3. Security Protocol: Under no circumstances should passwords be stored in plaintext. Access to the Windows SMB Share (192.168.1.50) is audited.
4. Remote Access: VPN is required for connections outside the primary 192.168.1.0/24 subnet.
5. Inquiries: Contact HR or IT support at extension 404.`
  },
  {
    id: '102',
    name: 'Network_Topology_Map.png',
    path: 'Public_Share/Network_Topology_Map.png',
    type: 'file',
    size: 245800,
    updatedAt: '2026-05-12T11:24:00Z',
    extension: 'png',
    owner: 'digihub\\john',
    permissions: { canRead: true, canWrite: false, canDelete: false, canRename: false },
    content: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=600&auto=format&fit=crop' // Will render a beautiful server room map
  },
  {
    id: '103',
    name: 'General_Tasks.json',
    path: 'Public_Share/General_Tasks.json',
    type: 'file',
    size: 1024,
    updatedAt: '2026-06-27T02:10:00Z',
    extension: 'json',
    owner: 'digihub\\847',
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
    content: `{
  "tasks": [
    { "id": 1, "title": "Audit SMB Shared Permissions", "status": "In Progress", "assignee": "john" },
    { "id": 2, "title": "Configure Active Directory for Hub-847", "status": "Completed", "assignee": "john" },
    { "id": 3, "title": "Check 192.168.1.50 Disk Usage", "status": "Pending", "assignee": "john" }
  ]
}`
  },

  // Files in Finance_Reports
  {
    id: '201',
    name: 'Q2_Budget_Draft.csv',
    path: 'Finance_Reports/Q2_Budget_Draft.csv',
    type: 'file',
    size: 1530,
    updatedAt: '2026-06-20T16:40:00Z',
    extension: 'csv',
    owner: 'digihub\\finance_admin',
    permissions: { canRead: true, canWrite: false, canDelete: false, canRename: false },
    content: `Category,Projected,Actual,Variance
Infrastructure,45000,42100,-2900
Software Licensing,18000,19500,+1500
Network Support,7500,7500,0
Hardware Provisioning,32000,34500,+2500
Total,102500,103600,+1100`
  },
  {
    id: '202',
    name: 'Payroll_Audit_CONFIDENTIAL.txt',
    path: 'Finance_Reports/Payroll_Audit_CONFIDENTIAL.txt',
    type: 'file',
    size: 890,
    updatedAt: '2026-06-22T10:15:00Z',
    extension: 'txt',
    owner: 'digihub\\finance_admin',
    permissions: { canRead: true, canWrite: false, canDelete: false, canRename: false },
    content: `CONFIDENTIAL MEMORANDUM - DIGIHUB PAYROLL AUDIT

DO NOT SHARE THIS FILE OUTSIDE THE FINANCE GROUP.

The payroll audit for the period of Q1-Q2 2026 has concluded. 
All domain employee logs matched the AD domain credentials structure.
- Total Active Contractors: 12
- Active Full-Time Employees: 48
- Verification Code: SMB3-CONF-2026`
  },

  // Files in IT_Infrastructure (Only John / Admin has read/write)
  {
    id: '301',
    name: 'Domain_Controller_Setup.ps1',
    path: 'IT_Infrastructure/Domain_Controller_Setup.ps1',
    type: 'file',
    size: 2350,
    updatedAt: '2026-06-26T18:00:00Z',
    extension: 'ps1',
    owner: 'digihub\\john',
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
    content: `# PowerShell Domain Controller & SMB Setup Script
Import-Module ADDSDeployment
Install-ADDSDomainController \
  -CreateDnsDelegation:$false \
  -DatabasePath "C:\\Windows\\NTDS" \
  -DomainMode "WinThreshold" \
  -DomainName "digihub.local" \
  -DomainNetbiosName "DIGIHUB" \
  -InstallDns:$true \
  -LogPath "C:\\Windows\\NTDS" \
  -NoRebootOnCompletion:$false \
  -SysvolPath "C:\\Windows\\SYSVOL" \
  -Force:$true`
  },
  {
    id: '302',
    name: 'smb_server_config.ini',
    path: 'IT_Infrastructure/smb_server_config.ini',
    type: 'file',
    size: 612,
    updatedAt: '2026-06-27T01:30:00Z',
    extension: 'ini',
    owner: 'digihub\\john',
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
    content: `[SMB_SERVER]
host = 192.168.1.50
port = 445
protocol_min = SMB2_10
protocol_max = SMB3_11
security = user
encrypt_data = required

[SHARES]
Public_Share = C:\\shares\\public
Finance_Reports = C:\\shares\\finance
IT_Infrastructure = C:\\shares\\it_infra
digihub_847_shared = C:\\shares\\user_847`
  },

  // Files in digihub_847_shared
  {
    id: '401',
    name: 'task_notes_847.txt',
    path: 'digihub_847_shared/task_notes_847.txt',
    type: 'file',
    size: 420,
    updatedAt: '2026-06-27T08:05:00Z',
    extension: 'txt',
    owner: 'digihub\\847',
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
    content: `Weekly notes for User 847:
- Successfully connected to Windows Server 192.168.1.50 via Android SMB Explorer app.
- Verified file transfer operations for the 'Public_Share' folder.
- Need to coordinate with IT Administrator (john) regarding Finance group read access.`
  },
  {
    id: '402',
    name: 'uploaded_log_demo.txt',
    path: 'digihub_847_shared/uploaded_log_demo.txt',
    type: 'file',
    size: 124,
    updatedAt: '2026-06-27T08:30:00Z',
    extension: 'txt',
    owner: 'digihub\\847',
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
    content: `[2026-06-27 15:30:00] SMB Connection verified.
[2026-06-27 15:30:05] Tree Connect successful for share Public_Share.`
  }
];

/**
 * Filter and map permissions for a specific user role.
 * 
 * Rules:
 * 1. Admin (john): Has read/write/delete/rename on EVERYTHING.
 * 2. Employee (847):
 *    - Has read/write/delete/rename on digihub_847_shared and Public_Share/General_Tasks.json.
 *    - Has read-only on Public_Share/Office_Policy_2026.txt and Finance_Reports.
 *    - IT_Infrastructure folder is completely invisible.
 * 3. Guest/Other (any valid DOMAIN\username format):
 *    - Has read-only on Public_Share.
 *    - Inaccessible/invisible for IT_Infrastructure, Finance_Reports, and digihub_847_shared.
 *    - Has full control over a newly auto-created folder called "digihub_username_shared".
 */
export function getFilteredFilesForUser(username: string, rawFiles: SMBFile[]): SMBFile[] {
  const normUser = username.toLowerCase();
  const isAdmin = normUser === 'digihub\\john' || normUser === 'john' || normUser === 'admin' || normUser === 'digihub\\admin';
  const isEmployee847 = normUser === 'digihub\\847' || normUser === '847';

  return rawFiles
    .map(file => {
      // Create a shallow copy to prevent editing original imports
      const copy = { ...file, permissions: { ...file.permissions } };

      // Apply rule mappings
      if (isAdmin) {
        // Admin has complete control over EVERYTHING
        copy.permissions = { canRead: true, canWrite: true, canDelete: true, canRename: true };
        return copy;
      }

      if (isEmployee847) {
        // IT_Infrastructure is hidden
        if (file.path === 'IT_Infrastructure' || file.path.startsWith('IT_Infrastructure/')) {
          return null;
        }

        // Finance_Reports is read-only
        if (file.path === 'Finance_Reports' || file.path.startsWith('Finance_Reports/')) {
          copy.permissions = { canRead: true, canWrite: false, canDelete: false, canRename: false };
        }

        // Public Share top level is read/write
        if (file.path === 'Public_Share') {
          copy.permissions = { canRead: true, canWrite: true, canDelete: false, canRename: false };
        }

        // Specific sub-files in Public_Share
        if (file.path === 'Public_Share/Office_Policy_2026.txt' || file.path === 'Public_Share/Network_Topology_Map.png') {
          copy.permissions = { canRead: true, canWrite: false, canDelete: false, canRename: false };
        }

        return copy;
      }

      // Guest / General User
      // Only Public_Share is visible
      const isPublicShare = file.path === 'Public_Share' || file.path.startsWith('Public_Share/');
      const isPersonalFolder = file.path.startsWith(`digihub_${normUser.split('\\')[1] || normUser}_shared`);

      if (isPublicShare) {
        // They can read Public_Share, but cannot write/delete the main office policies or map
        if (file.path === 'Public_Share') {
          copy.permissions = { canRead: true, canWrite: true, canDelete: false, canRename: false };
        } else if (file.owner.toLowerCase() !== normUser) {
          copy.permissions = { canRead: true, canWrite: false, canDelete: false, canRename: false };
        } else {
          copy.permissions = { canRead: true, canWrite: true, canDelete: true, canRename: true };
        }
        return copy;
      }

      if (isPersonalFolder) {
        copy.permissions = { canRead: true, canWrite: true, canDelete: true, canRename: true };
        return copy;
      }

      // Hide all other shares (Finance, IT, 847_shared)
      return null;
    })
    .filter((f): f is SMBFile => f !== null);
}
