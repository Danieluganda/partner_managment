process.env.NODE_ENV = 'test';
process.env.DISABLE_EXCEL_LOADER = '1';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({}))
}));

const DatabaseService = require('../services/DatabaseService');
const dataService = require('../services/DataService');

beforeAll(async () => {
  if (typeof dataService.saveData !== 'function' || typeof dataService.loadData !== 'function') {
    throw new Error('DataService missing saveData/loadData - tests require JSON fallback API');
  }
  await dataService.saveData({});
});

afterAll(async () => {
  try { await dataService.saveData({}); } catch (e) {}
});

async function resetJsonStore() { await dataService.saveData({}); }
async function seedJsonStore(store) { await dataService.saveData(store); }

describe('Additional DatabaseService JSON-fallback tests (extra)', () => {
  beforeEach(async () => { await resetJsonStore(); });

  test('updatePartner persists changes and returns updated record', async () => {
    const db = new DatabaseService({ logger: console });
    db.prisma = null;
    if (!db.dataService) db.dataService = dataService;

    const created = await db.createPartner({ partnerName: 'UpdBefore', partnerType: 'A', contactEmail: 'before@example.test' });
    const id = created.id || created.partnerId;
    expect(id).toBeDefined();

    const updated = await db.updatePartner(id, { partnerName: 'UpdAfter', partnerType: 'B', contactEmail: 'after@example.test' });
    // implementation differences: may return object or boolean; verify persisted store
    const store = await dataService.loadData();
    const found = (store.masterRegister || []).find(p => p.id === id || p.partnerId === id);
    expect(found).toBeDefined();
    expect(found.partnerName === 'UpdAfter' || found.name === 'UpdAfter').toBeTruthy();
    expect(found.contactEmail === 'after@example.test' || found.email === 'after@example.test').toBeTruthy();
  });

  test('updateDeliverable persists changes and remains associated to partner', async () => {
    const db = new DatabaseService({ logger: console });
    db.prisma = null;
    if (!db.dataService) db.dataService = dataService;

    const partner = await db.createPartner({ partnerName: 'OwnerForUpdate', partnerType: 'P' });
    const pid = partner.id || partner.partnerId;
    const created = await db.createDeliverable({ title: 'DelOld', partnerId: pid });
    const did = created.id || created.uuid;
    expect(did).toBeDefined();

    await db.updateDeliverable(did, { title: 'DelNew', status: 'Completed' });
    const store = await dataService.loadData();
    const found = (store.deliverables || []).find(d => d.id === did || d.uuid === did);
    expect(found).toBeDefined();
    expect(found.title === 'DelNew' || found.description === 'DelNew').toBeTruthy();
    expect(found.partnerId === pid || found.partner === pid).toBeTruthy();
  });

  test('deletePartner handles repeated deletes gracefully', async () => {
    const db = new DatabaseService({ logger: console });
    db.prisma = null;
    if (!db.dataService) db.dataService = dataService;

    const created = await db.createPartner({ partnerName: 'TempDel', partnerType: 'T' });
    const id = created.id || created.partnerId;
    expect(id).toBeDefined();

    const first = await db.deletePartner(id);
    // second delete should not throw; it may return false/null
    let secondThrew = false;
    let secondRes;
    try { secondRes = await db.deletePartner(id); } catch (e) { secondThrew = true; }
    expect(secondThrew).toBe(false);

    const store = await dataService.loadData();
    const found = (store.masterRegister || []).find(p => p.id === id || p.partnerId === id);
    expect(found).toBeUndefined();
  });

  test('concurrent createPartner generates unique ids for many items', async () => {
    const db = new DatabaseService({ logger: console });
    db.prisma = null;
    if (!db.dataService) db.dataService = dataService;

    const N = 20;
    const tasks = Array.from({ length: N }).map((_, i) =>
      db.createPartner({ partnerName: `Bulk-${i}`, partnerType: 'Bulk' })
    );
    const created = await Promise.all(tasks);
    const ids = created.map(c => c.id || c.partnerId || c.uuid).filter(Boolean);
    // ensure count matches and uniqueness
    expect(ids.length).toBe(N);
    const unique = new Set(ids);
    expect(unique.size).toBe(N);

    const store = await dataService.loadData();
    const storedNames = (store.masterRegister || []).map(p => p.partnerName || p.name);
    for (let i = 0; i < N; i++) expect(storedNames).toContain(`Bulk-${i}`);
  });

  test('searchPartners returns array and matches across multiple fields', async () => {
    const seeded = {
      masterRegister: [
        { id: 'sp-1', partnerName: 'FindAlpha', partnerType: 'X' },
        { id: 'sp-2', partnerName: 'BetaFind', partnerType: 'Y' },
        { id: 'sp-3', partnerName: 'Gamma', partnerType: 'Z' }
      ]
    };
    await seedJsonStore(seeded);

    const db = new DatabaseService({ logger: console });
    db.prisma = null;
    if (!db.dataService) db.dataService = dataService;

    const results = await db.searchPartners('Find');
    expect(Array.isArray(results)).toBe(true);
    // should include sp-1 and sp-2 (both contain 'Find' somewhere)
    const ids = results.map(r => r.id || r.partnerId);
    expect(ids).toEqual(expect.arrayContaining(['sp-1', 'sp-2']));
  });

  test('createExternalPartner then getExternalPartnerById persists and returns expected fields', async () => {
    const db = new DatabaseService({ logger: console });
    db.prisma = null;
    if (!db.dataService) db.dataService = dataService;

    const payload = { name: 'ExtCo', contactEmail: 'extco@example.test', type: 'Vendor' };
    const created = await db.createExternalPartner(payload);
    expect(created).toBeDefined();
    const id = created.id || created.partnerId;
    expect(id).toBeDefined();

    const fetched = await db.getExternalPartnerById(id);
    expect(fetched).toBeDefined();
    expect(fetched.name === payload.name || fetched.partnerName === payload.name).toBeTruthy();
    expect(fetched.contactEmail === payload.contactEmail || fetched.email === payload.contactEmail).toBeTruthy();
  });
});