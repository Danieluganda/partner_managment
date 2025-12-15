const request = require('supertest');
const app = require('../app');

describe('Partners API', () => {
    let createdPartnerId;

    // Test partner registration
    it('should register a new partner', async () => {
        const res = await request(app)
            .post('/api/partners')
            .send({
                partnerName: 'Jest Test Partner',
                partnerType: 'TestType',
                contactEmail: 'jest-partner@example.com'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.partner).toHaveProperty('id');
        createdPartnerId = res.body.partner.id;
    });

    // Test partner retrieval
    it('should retrieve the created partner', async () => {
        const res = await request(app)
            .get(`/api/partners/${createdPartnerId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('id', createdPartnerId);
        expect(res.body).toHaveProperty('partnerName', 'Jest Test Partner');
    });

    // Test partner editing
    it('should edit the partner', async () => {
        const res = await request(app)
            .put(`/api/partners/${createdPartnerId}`)
            .send({
                partnerName: 'Jest Test Partner Updated',
                partnerType: 'TestType',
                contactEmail: 'jest-partner@example.com'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.partner).toHaveProperty('partnerName', 'Jest Test Partner Updated');
    });

    // Test partner list retrieval
    it('should retrieve all partners', async () => {
        const res = await request(app)
            .get('/api/partners');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some(p => p.id === createdPartnerId)).toBe(true);
    });

    // Clean up: delete the test partner
    afterAll(async () => {
        if (createdPartnerId) {
            await request(app).delete(`/api/partners/${createdPartnerId}`);
        }
    });
});