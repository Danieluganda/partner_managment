const request = require('supertest');

// mock DatabaseService before app is required
jest.mock('../services/DatabaseService', () => {
  return jest.fn().mockImplementation(() => ({
    createComplianceRecord: jest.fn().mockResolvedValue({ id: 'fixed-uuid-0000-0000-0000-000000000000' })
  }));
});

const DatabaseService = require('../services/DatabaseService'); // the mocked constructor
let app;

beforeAll(() => {
  // require app after mocking DatabaseService so routes use the mock
  app = require('../app'); // ensure app exports an express() instance, not listening server
});

describe('POST /api/compliance', () => {
  test('submits compliance payload and returns success', async () => {
    const payload = {
      partnerId: 'p-123',
      partnerName: 'Test Partner',
      reportingRequirement: 'Quarterly report',
      dueDate: '2025-12-14',
      reportingPeriod: 'quarterly',
      status: 'submitted',
      notes: 'some notes'
    };

    const res = await request(app)
      .post('/api/compliance')
      .send(payload)
      .set('Accept', 'application/json');

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);

    // ensure DatabaseService.createComplianceRecord invoked with normalized payload
    const instance = DatabaseService.mock.instances[0];
    expect(instance).toBeDefined();
    expect(instance.createComplianceRecord).toHaveBeenCalledTimes(1);
    const calledWith = instance.createComplianceRecord.mock.calls[0][0];
    expect(calledWith.partnerId).toBe(payload.partnerId);
    expect(calledWith.reportingRequirement).toBe(payload.reportingRequirement);
  });
});