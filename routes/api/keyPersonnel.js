const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all key personnel
router.get('/', async (req, res) => {
    try {
        const { partnerId, partnerType, search, active } = req.query;
        
        let whereClause = {};
        
        // Filter by partner ID
        if (partnerId) {
            whereClause.partnerId = partnerId;
        }
        
        // Filter by partner type
        if (partnerType && partnerType !== 'all') {
            whereClause.partnerType = partnerType;
        }
        
        // Filter by active status
        if (active === 'true') {
            whereClause.workStatus = 'Active';
        }
        
        // Search functionality
        if (search) {
            whereClause.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { emailAddress: { contains: search, mode: 'insensitive' } },
                { jobTitle: { contains: search, mode: 'insensitive' } },
                { partnerName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const personnel = await prisma.personnel.findMany({
            where: whereClause,
            orderBy: [
                { partnerName: 'asc' },
                { fullName: 'asc' }
            ]
        });

        // Transform personnel data to include summary information
        const personnelWithSummary = personnel.map(person => ({
            ...person,
            summary: {
                id: person.id,
                name: person.fullName,
                title: person.jobTitle,
                partner: person.partnerName,
                partnerType: person.partnerType,
                email: person.emailAddress,
                phone: person.phoneNumber,
                status: person.workStatus,
                department: person.department,
                seniority: person.seniority
            },
            // Add a getSummary-like function as a property
            getSummary: function() {
                return `${this.fullName} - ${this.jobTitle} at ${this.partnerName}`;
            }
        }));

        // Get statistics
        const stats = {
            total: personnelWithSummary.length,
            byPartnerType: {},
            byStatus: {},
            byDepartment: {}
        };

        personnelWithSummary.forEach(person => {
            // Count by partner type
            stats.byPartnerType[person.partnerType] = (stats.byPartnerType[person.partnerType] || 0) + 1;
            
            // Count by status
            if (person.workStatus) {
                stats.byStatus[person.workStatus] = (stats.byStatus[person.workStatus] || 0) + 1;
            }
            
            // Count by department
            if (person.department) {
                stats.byDepartment[person.department] = (stats.byDepartment[person.department] || 0) + 1;
            }
        });

        res.json({
            success: true,
            data: personnelWithSummary,
            stats,
            total: personnelWithSummary.length
        });

    } catch (error) {
        console.error('Error fetching key personnel:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch key personnel',
            error: error.message
        });
    }
});

// Get personnel by partner ID
router.get('/by-partner/:partnerId', async (req, res) => {
    try {
        const { partnerId } = req.params;
        
        const personnel = await prisma.personnel.findMany({
            where: { partnerId: partnerId },
            orderBy: { fullName: 'asc' }
        });

        const partner = await prisma.partners.findUnique({
            where: { id: partnerId },
            select: { partnerName: true, partnerType: true }
        });

        res.json({
            success: true,
            data: personnel,
            partner: partner,
            total: personnel.length
        });

    } catch (error) {
        console.error('Error fetching personnel by partner:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch personnel by partner',
            error: error.message
        });
    }
});

// Get personnel summary for dashboard
router.get('/summary', async (req, res) => {
    try {
        const [totalPersonnel, activePersonnel, personnelByType] = await Promise.all([
            prisma.personnel.count(),
            prisma.personnel.count({
                where: { workStatus: 'Active' }
            }),
            prisma.personnel.groupBy({
                by: ['partnerType'],
                _count: {
                    id: true
                }
            })
        ]);

        const summary = {
            total: totalPersonnel,
            active: activePersonnel,
            inactive: totalPersonnel - activePersonnel,
            byType: personnelByType.reduce((acc, item) => {
                acc[item.partnerType] = item._count.id;
                return acc;
            }, {})
        };

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Error fetching personnel summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch personnel summary',
            error: error.message
        });
    }
});

// Get filter options for personnel
router.get('/filters', async (req, res) => {
    try {
        const [partnerTypes, departments, statuses] = await Promise.all([
            prisma.personnel.findMany({
                select: { partnerType: true },
                distinct: ['partnerType']
            }),
            prisma.personnel.findMany({
                select: { department: true },
                distinct: ['department'],
                where: { department: { not: null } }
            }),
            prisma.personnel.findMany({
                select: { workStatus: true },
                distinct: ['workStatus'],
                where: { workStatus: { not: null } }
            })
        ]);

        res.json({
            success: true,
            filters: {
                partnerTypes: partnerTypes.map(p => p.partnerType),
                departments: departments.map(d => d.department),
                statuses: statuses.map(s => s.workStatus)
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

module.exports = router;