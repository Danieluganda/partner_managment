// routes/api/masterRegister.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get master register with all partners including ESOs
router.get('/', async (req, res) => {
    try {
        const { type, region, status, search } = req.query;

        let whereClause = {};

        // Only add filters if they are provided and not 'all'
        if (type && type !== 'all') {
            whereClause.partnerType = type;
        }
        if (region && region !== 'all') {
            whereClause.regionsOfOperation = { contains: region };
        }
        if (status && status !== 'all') {
            whereClause.contractStatus = status;
        }
        if (search) {
            whereClause.OR = [
                { partnerName: { contains: search, mode: 'insensitive' } },
                { keyPersonnel: { contains: search, mode: 'insensitive' } },
                { regionsOfOperation: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Fetch all partners if no filters are set
        const partners = await prisma.partners.findMany({
            where: Object.keys(whereClause).length ? whereClause : undefined,
            orderBy: [
                { partnerType: 'asc' },
                { partnerName: 'asc' }
            ]
        });

        // Attach personnel and personnelCount to each partner
        const partnersWithDetails = await Promise.all(
            partners.map(async (partner) => {
                const personnel = await prisma.personnel.findMany({
                    where: { partnerId: partner.id },
                    select: {
                        fullName: true,
                        jobTitle: true,
                        emailAddress: true,
                        phoneNumber: true
                    },
                    take: 5
                });
                return {
                    ...partner,
                    personnelCount: personnel.length,
                    personnel,
                    keyPersonnelFormatted: personnel.map(p =>
                        `${p.fullName} (${p.jobTitle})`
                    ).join(', ')
                };
            })
        );

        // Calculate stats
        const stats = {
            total: partnersWithDetails.length,
            byType: {},
            byStatus: {},
            byRegion: {}
        };
        partnersWithDetails.forEach(partner => {
            stats.byType[partner.partnerType] = (stats.byType[partner.partnerType] || 0) + 1;
            if (partner.contractStatus) {
                stats.byStatus[partner.contractStatus] = (stats.byStatus[partner.contractStatus] || 0) + 1;
            }
            if (partner.regionsOfOperation) {
                partner.regionsOfOperation.split(',').map(r => r.trim()).forEach(region => {
                    stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
                });
            }
        });

        res.json({
            success: true,
            data: partnersWithDetails,
            stats,
            total: partnersWithDetails.length
        });

    } catch (error) {
        console.error('Error fetching master register:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch master register',
            error: error.message
        });
    }
});

// Get filter options for master register
router.get('/filters', async (req, res) => {
    try {
        const [partnerTypes, contractStatuses, regions] = await Promise.all([
            // Get unique partner types
            prisma.partners.findMany({
                select: { partnerType: true },
                distinct: ['partnerType']
            }),
            // Get unique contract statuses
            prisma.partners.findMany({
                select: { contractStatus: true },
                distinct: ['contractStatus'],
                where: { contractStatus: { not: null } }
            }),
            // Get unique regions
            prisma.partners.findMany({
                select: { regionsOfOperation: true },
                where: { regionsOfOperation: { not: null } }
            })
        ]);

        // Process regions (they can be comma-separated)
        const allRegions = new Set();
        regions.forEach(r => {
            if (r.regionsOfOperation) {
                r.regionsOfOperation.split(',').forEach(region => {
                    allRegions.add(region.trim());
                });
            }
        });

        res.json({
            success: true,
            filters: {
                partnerTypes: partnerTypes.map(p => p.partnerType),
                contractStatuses: contractStatuses.map(s => s.contractStatus),
                regions: Array.from(allRegions).sort()
            }
        });

    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch filter options',
            error: error.message
        });
    }
});

// Create a new partner
router.post('/', async (req, res) => {
    try {
        const body = req.body;

        // Helper to parse float or fallback to 0
        const parseFloatOrZero = (val) => {
            if (val === undefined || val === null || val === '') return 0;
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        // Combine extra notes into comments
        const comments = [
            body.financialComments,
            body.notes,
            body.partnerDescription,
            body.specialRequirements,
            body.organizationAddress
        ].filter(Boolean).join('\n---\n') || null;

        // Map only fields that exist in the Prisma model
        const partnerData = {
            partnerName: body.partnerName,
            partnerType: body.partnerType,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone || null,
            keyPersonnel: body.keyPersonnel || null,
            regionsOfOperation: body.regionsOfOperation || null,
            taskOrderPrice: body.taskOrder || null,
            contractStatus: body.contractStatus || null,
            commencementDate: body.commencementDate || null,
            contractDuration: body.contractTerm || null,
            contractValue: body.contractValue || null,
            contractStartDate: body.agreementDate || null,
            contractEndDate: null,
            actualSpent: parseFloatOrZero(body.actualSpent),
            budgetAllocated: parseFloatOrZero(body.budgetAllocated),
            comments,
            financialStatus: body.financialStatus || null,
            lastPaymentDate: body.lastPaymentDate || null,
            nextPaymentDue: body.nextPaymentDue || null,
            paymentSchedule: body.paymentSchedule || null,
            q1ActualPaid: parseFloatOrZero(body.q1ActualPaid),
            q2ActualPaid: parseFloatOrZero(body.q2ActualPaid),
            q3ActualPaid: parseFloatOrZero(body.q3ActualPaid),
            q4ActualPaid: parseFloatOrZero(body.q4ActualPaid),
            utilizationRate: parseFloatOrZero(body.utilizationRate),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Generate a UUID for the partner id
        const crypto = require('crypto');
        partnerData.id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

        // Validate required fields
        if (!partnerData.partnerName || !partnerData.partnerType || !partnerData.contactEmail) {
            return res.status(400).json({ success: false, message: 'partnerName, partnerType, and contactEmail are required.' });
        }

        const newPartner = await prisma.partners.create({ data: partnerData });

        res.status(201).json({ success: true, data: newPartner });
    } catch (error) {
        console.error('Error creating partner:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create partner',
            error: error.message
        });
    }
});

// Get a single partner by ID
router.get('/:id', async (req, res) => {
    try {
        const partner = await prisma.partners.findUnique({
            where: { id: req.params.id }
        });
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }
        res.status(200).json(partner);
    } catch (error) {
        console.error('Error fetching partner:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch partner', error: error.message });
    }
});

// Edit a partner by ID
router.put('/:id', async (req, res) => {
    try {
        const updateData = req.body;
        updateData.updatedAt = new Date();

        const updatedPartner = await prisma.partners.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.status(200).json({ success: true, data: updatedPartner });
    } catch (error) {
        if (error.code === 'P2025') {
            // Prisma not found error
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }
        console.error('Error updating partner:', error);
        res.status(500).json({ success: false, message: 'Failed to update partner', error: error.message });
    }
});

module.exports = router;

// In your main server file (e.g., app.js or server.js), use the following line to include this router:
// app.use('/api/master-register', require('./routes/api/masterRegister'));
