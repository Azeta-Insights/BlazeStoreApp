import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  Plus,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Key,
  CheckCircle2,
  Crown,
  Trash2,
  X
} from 'lucide-react';
import { User, AdminRole } from '../../types';
import { api } from '../../services/api';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface AdminUsersRolesProps {
  adminRole: AdminRole;
  isDarkMode: boolean;
  onShowToast: (msg: string) => void;
}

export const AdminUsersRoles: React.FC<AdminUsersRolesProps> = ({
  adminRole,
  isDarkMode,
  onShowToast,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    roleType: 'manager' as AdminRole,
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
      onShowToast('❌ Failed to fetch user directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, targetRoleType: AdminRole) => {
    const roleLabel =
      targetRoleType === 'owner'
        ? 'Store Owner'
        : targetRoleType === 'manager'
        ? 'Store Manager'
        : 'Club Member';

    try {
      await api.updateUserRole(userId, roleLabel, targetRoleType);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: roleLabel, roleType: targetRoleType } : u))
      );
      onShowToast(`🛡️ User role updated to ${roleLabel}`);
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Role update failed: ${e?.message}`);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setUserToDelete(target);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await api.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      onShowToast(`🗑️ User ${userToDelete.name} deleted successfully`);
      setUserToDelete(null);
    } catch (e: any) {
      console.error(e);
      onShowToast(`❌ Failed to delete user: ${e?.message || 'Server error'}`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.registerUser({
        name: staffForm.name,
        email: staffForm.email,
        password: staffForm.password || 'Staff123!',
        phone: staffForm.phone,
        roleType: staffForm.roleType,
      });

      onShowToast(`🎉 Staff account created for ${staffForm.name}!`);
      setIsAddStaffModalOpen(false);
      setStaffForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        roleType: 'manager',
      });
      loadUsers();
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ ${err?.message || 'Failed to create staff'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight">Admin & Customer Roles</h2>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
              Firestore Users
            </span>
          </div>
          <p className="text-xs text-[#8A8A94] mt-0.5">
            Manage permissions, Store Owner, Store Manager, and customer accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className={`p-2 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition ${
              isDarkMode ? 'border-[#27272A] text-[#A1A1AA]' : 'border-[#EDEDF2] text-[#52525B]'
            }`}
            title="Refresh users"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddStaffModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C6FE0] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Admin / Staff</span>
          </button>
        </div>
      </div>

      {/* Role Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Store Owner</h3>
                <span className="text-[10px] text-[#8A8A94]">Super Admin</span>
              </div>
            </div>
            <span className="text-xl font-black text-amber-500">
              {users.filter((u) => u.roleType === 'owner' || u.role?.toLowerCase().includes('owner')).length}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8A94] mt-2.5">
            Full root authority: Revenue metrics, Process refunds, Database sync, Role delegation, Product deletion.
          </p>
        </div>

        <div
          className={`rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C6FE0]/15 text-[#7C6FE0]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Store Manager</h3>
                <span className="text-[10px] text-[#8A8A94]">Operations Lead</span>
              </div>
            </div>
            <span className="text-xl font-black text-[#7C6FE0]">
              {users.filter((u) => u.roleType === 'manager' || u.role?.toLowerCase().includes('manager')).length}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8A94] mt-2.5">
            Operations control: Inventory stock adjustments, Process customer refunds, Order fulfillment status, Sales reports.
          </p>
        </div>

        <div
          className={`rounded-2xl p-5 border ${
            isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34D399]/15 text-[#059669]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Registered Customers</h3>
                <span className="text-[10px] text-[#8A8A94]">Storefront Shoppers</span>
              </div>
            </div>
            <span className="text-xl font-black text-[#059669]">
              {users.filter((u) => u.roleType !== 'owner' && u.roleType !== 'manager' && !u.role?.toLowerCase().includes('admin')).length}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8A94] mt-2.5">
            Storefront customers saved to Firestore upon registration with saved cart, wishlist, and order history.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className={`rounded-2xl p-3 border flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A94]" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
              isDarkMode ? 'bg-[#202024] border border-[#27272A] text-white' : 'bg-[#FAF9FC] border border-[#EDEDF2] text-[#1F1F23]'
            }`}
          />
        </div>
      </div>

      {/* Users Directory Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#EDEDF2] shadow-xs'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-bold uppercase tracking-wider text-[#8A8A94] ${
                isDarkMode ? 'bg-[#202024] border-[#27272A]' : 'bg-[#FAF9FC] border-[#EDEDF2]'
              }`}
            >
              <tr>
                <th className="py-3 px-4">User & Avatar</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Current Role</th>
                <th className="py-3 px-4 text-center">Change Permission Role</th>
                <th className="py-3 px-4 text-right">Registration Date</th>
                {adminRole === 'owner' && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDF2] dark:divide-[#27272A]">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isOwner = u.roleType === 'owner' || u.role?.toLowerCase().includes('owner');
                  const isManager = u.roleType === 'manager' || u.role?.toLowerCase().includes('manager');

                  return (
                    <tr key={u.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`
                            }
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-[#7C6FE0]/20"
                          />
                          <div>
                            <span className="font-bold block">{u.name}</span>
                            <span className="text-[10px] text-[#8A8A94] font-mono block">{u.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-[#52525B] dark:text-[#A1A1AA] block">{u.email}</span>
                        <span className="text-[10px] text-[#8A8A94] block">{u.phone || 'No phone'}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs px-2.5 py-0.5 rounded-full">
                            <Crown className="h-3 w-3" /> Store Owner
                          </span>
                        ) : isManager ? (
                          <span className="inline-flex items-center gap-1 bg-[#7C6FE0]/15 text-[#7C6FE0] font-bold text-xs px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="h-3 w-3" /> Store Manager
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[#E3F2DD] text-[#2E7D32] font-bold text-xs px-2.5 py-0.5 rounded-full">
                            <Users className="h-3 w-3" /> Customer
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <select
                          value={u.roleType || (isOwner ? 'owner' : isManager ? 'manager' : 'customer')}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as AdminRole)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
                            isDarkMode ? 'bg-[#202024] border-[#27272A] text-white' : 'bg-[#FAF9FC] border-[#EDEDF2] text-[#1F1F23]'
                          }`}
                        >
                          <option value="customer">Customer / Member</option>
                          <option value="manager">🛡️ Store Manager</option>
                          <option value="owner">👑 Store Owner</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right text-[11px] text-[#8A8A94]">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </td>

                      {adminRole === 'owner' && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                            title="Delete User from Firestore"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={adminRole === 'owner' ? 6 : 5} className="py-12 text-center text-[#8A8A94]">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff / Admin Modal */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsAddStaffModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          <div
            className={`relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl ${
              isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#7C6FE0]" />
                <h3 className="font-bold text-base">Create Admin / Staff Account</h3>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Vance"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin.staff@blazestore.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Staff123!"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Role Type *</label>
                  <select
                    value={staffForm.roleType}
                    onChange={(e) => setStaffForm({ ...staffForm, roleType: e.target.value as AdminRole })}
                    className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-bold text-[#7C6FE0] focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                  >
                    <option value="manager">🛡️ Store Manager</option>
                    <option value="owner">👑 Store Owner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8A8A94] block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 345-6789"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0]"
                />
              </div>

              <div className="pt-3 border-t border-[#EDEDF2] dark:border-[#27272A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A8A94] hover:bg-[#FAF9FC] dark:hover:bg-[#27272A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-[#7C6FE0] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#6D60D6] disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating in Firestore...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User Account"
        message="Are you sure you want to permanently remove this user account from the database?"
        itemName={userToDelete ? `${userToDelete.name} (${userToDelete.email}) - ${userToDelete.role}` : undefined}
        confirmText="Delete User"
        isLoading={isDeletingUser}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
