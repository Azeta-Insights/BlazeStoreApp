import dotenv from 'dotenv';
dotenv.config();

import { registerUser } from '../server/db';
import { AdminRole } from '../src/types';

async function seedAdminAccounts() {
  console.log('[Seed] Starting admin accounts seeding script for Firestore...');

  const ownerAccounts = [
    {
      name: 'Azeta Blessing',
      email: 'azetablessingb@gmail.com',
      phone: '+234 803 345 6789',
      roleType: 'owner' as AdminRole,
    },
    {
      name: 'Store Owner (Admin)',
      email: 'owner@blazestore.com',
      phone: '+234 803 345 6789',
      roleType: 'owner' as AdminRole,
    },
  ];

  for (const owner of ownerAccounts) {
    await registerUser(owner);
  }

  const managerAccounts = [
    {
      name: 'Blessing Waydiva',
      email: 'blessing.waydiva@gmail.com',
      phone: '+234 812 987 6543',
      roleType: 'manager' as AdminRole,
    },
    {
      name: 'Store Operations Manager',
      email: 'manager@blazestore.com',
      phone: '+234 812 987 6543',
      roleType: 'manager' as AdminRole,
    },
  ];

  for (const manager of managerAccounts) {
    await registerUser(manager);
  }

  console.log('[Seed] Successfully seeded admin accounts into Firestore.');
  process.exit(0);
}

seedAdminAccounts().catch((err) => {
  console.error('[Seed] Error seeding admin accounts:', err);
  process.exit(1);
});
