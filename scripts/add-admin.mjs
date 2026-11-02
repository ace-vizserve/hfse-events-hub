// Usage: npm run db:add-admin -- person@example.com [administrator|controller] [--reset-password]
// Creates the login if needed and grants access. A generated password is printed once.
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const reset = args.includes('--reset-password');
const [email, role = 'administrator'] = args.filter((a) => a !== '--reset-password');
if (!email || !email.includes('@') || !['administrator', 'controller'].includes(role)) {
  console.error('Usage: npm run db:add-admin -- person@example.com [administrator|controller] [--reset-password]');
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function findUser(target) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
}

const password = randomBytes(15).toString('base64url');
let user = await findUser(email);
let showPassword = false;
if (!user) {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
  showPassword = true;
} else if (reset) {
  const { error } = await db.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  showPassword = true;
}

const { error } = await db.from('hfse_events_hub_event_admins').upsert({ user_id: user.id, role }, { onConflict: 'user_id' });
if (error) throw error;

console.log(`${email} now has ${role} access.`);
if (showPassword) console.log(`Password (shown once): ${password}`);
