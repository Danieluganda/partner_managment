const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid-0000-0000-0000-000000000000' }));

const DatabaseService = require('../services/DatabaseService');

describe('DatabaseService.createComplianceRecord', () => {
  let service;
  let mockCreate;

  beforeEach(() => {
    service = new DatabaseService();
    // replace real prisma with a mock
    mockCreate = jest.fn().mockResolvedValue({ id: 'fixed-uuid-0000-0000-0000-000000000000' });
    service.prisma = {
      compliance_records: { create: mockCreate }
    };
  });

  test('calls prisma.create with normalized fields and default complianceType', async () => {
    const payload = {
      partnerId: 'p-123',
      partnerName: 'Test Partner',
      reportingRequirement: 'Quarterly report',
      dueDate: '2025-12-14',
      reportingPeriod: 'quarterly',
      submissionDate: '2025-12-15',
      status: 'submitted',
      fmcsAuditStatus: 'not-audited',
      notes: 'some notes',
      // no complianceType provided -> should default to 'reporting'
    };

    await service.createComplianceRecord(payload);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg).toHaveProperty('data');
    const data = callArg.data;

    expect(data.id).toBe('fixed-uuid-0000-0000-0000-000000000000');
    expect(data.partnerId).toBe('p-123');
    expect(data.partnerName).toBe('Test Partner');
    expect(data.reportingRequirement).toBe('Quarterly report');
    expect(data.reportingPeriod).toBe('quarterly');
    expect(data.status).toBe('submitted');
    expect(data.fmcsAuditStatus).toBe('not-audited');
    expect(data.notes).toBe('some notes');
    expect(data.complianceType).toBe('reporting');

    // Date fields converted to Date objects
    expect(data.dueDate).toBeInstanceOf(Date);
    expect(data.submissionDate).toBeInstanceOf(Date);
    expect(data.dueDate.toISOString().startsWith('2025-12-14')).toBeTruthy();
  });

  test('handles missing optional fields and sets nulls/defaults', async () => {
    const payload = { partnerId: 'p-xyz' };
    await service.createComplianceRecord(payload);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.partnerId).toBe('p-xyz');
    expect(data.partnerName).toBeNull();
    expect(data.reportingRequirement).toBeNull();
    expect(data.dueDate).toBeNull();
    expect(data.complianceType).toBe('reporting');
  });
});