const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch (e) { bcrypt = null; }

const prisma = new PrismaClient();
let AuthService;
try { AuthService = require('../services/AuthService'); } catch (e) { AuthService = null; }

const users = [
  {
    id: 'cmhoh8wti0000stbsfy7hpas6',
    username: 'Kule Geofrey',
    email: 'geofrey.kule@outbox.africa',
    fullName: '',
    password: '@U53Rpass002',
    role: 'admin',
    createdAt: '2025-11-07T06:31:07.000Z'
  },
  {
    id: 'cmhoh4uy80000st4oe037qvst',
    username: 'Super user',
    email: 'daniel.bn1800@gmail.com',
    fullName: 'Daniel Uganda',
    password: 'B@seUrl123',
    role: 'admin',
    createdAt: '2025-11-07T06:27:58.000Z'
  }
];

function getDelegate(client) {
  if (!client) return null;
  const names = ['users','user','new_users','newUsers','new_users'];
  for (const n of names) if (client[n] && typeof client[n].findFirst === 'function') return client[n];
  const key = Object.keys(client).find(k => client[k] && typeof client[k].findFirst === 'function' && /user/i.test(k));
  return key ? client[key] : null;
}

async function main() {
  const apply = process.argv.includes('--yes');
  console.log(apply ? 'Applying changes...' : 'Dry run — no changes. Re-run with --yes to apply.');

  const authSvc = AuthService ? new AuthService() : null;
  const delegateFromAuth = authSvc && authSvc.prisma ? getDelegate(authSvc.prisma) : null;
  const delegate = delegateFromAuth || getDelegate(prisma);
  if (!delegate) {
    console.error('No Prisma user delegate found. Aborting.');
    await prisma.$disconnect();
    return;
  }

  for (const u of users) {
    // check existing by email or username
    const existing = await delegate.findFirst({ where: { OR: [{ email: u.email }, { username: u.username }] } });
    if (existing) {
      console.log(`SKIP (exists): ${u.email} / ${u.username} -> id=${existing.id}`);
      continue;
    }

    console.log(`${apply ? 'CREATE' : 'WILL CREATE'}: ${u.email} / ${u.username} (id=${u.id})`);
    if (!apply) continue;

    try {
      if (authSvc && typeof authSvc.createUser === 'function') {
        try {
          await authSvc.createUser({
            id: u.id,
            username: u.username,
            email: u.email,
            password: u.password,
            fullName: u.fullName,
            role: u.role
          });
        } catch (e) {
          // If AuthService fails, fall back to direct Prisma create with explicit id
          console.warn('AuthService.createUser failed, falling back to direct prisma create:', e && e.message ? e.message : e);
          let hashed = u.password;
          if (bcrypt) {
            const salt = await bcrypt.genSalt(10);
            hashed = await bcrypt.hash(u.password, salt);
          }
          await delegate.create({
            data: {
              id: u.id || crypto.randomUUID(),
              username: u.username,
              email: u.email,
              password: hashed,
              fullName: u.fullName,
              role: u.role,
              isActive: true,
              createdAt: new Date(u.createdAt),
              updatedAt: new Date(u.createdAt)
            }
          });
        }
      } else {
        let hashed = u.password;
        if (bcrypt) {
          const salt = await bcrypt.genSalt(10);
          hashed = await bcrypt.hash(u.password, salt);
        }
        await delegate.create({
          data: {
            id: u.id || crypto.randomUUID(),
            username: u.username,
            email: u.email,
            password: hashed,
            fullName: u.fullName,
            role: u.role,
            isActive: true,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.createdAt)
          }
        });
      }
      console.log(`Created: ${u.email}`);
    } catch (err) {
      console.error(`Failed to create ${u.email}:`, err && err.message ? err.message : err);
    }
  }

  await prisma.$disconnect();
  if (authSvc && authSvc.prisma && typeof authSvc.prisma.$disconnect === 'function') await authSvc.prisma.$disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e && e.message ? e.message : e); process.exit(1); });