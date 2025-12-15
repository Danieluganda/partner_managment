// Add sample compliance records to database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleComplianceData() {
    try {
        console.log('🔄 Adding sample compliance records...');

        // First, get existing partners to reference them
        const partners = await prisma.partner.findMany();
        const externalPartners = await prisma.externalPartner.findMany();

        if (partners.length === 0 && externalPartners.length === 0) {
            console.log('❌ No partners found in database. Please add partners first.');
            return;
        }

        // Sample compliance requirements
        const complianceRequirements = [
            {
                complianceType: 'Financial Reporting',
                requirement: 'Quarterly Financial Report - Q4 2024',
                status: 'compliant',
                dueDate: '2024-01-31',
                lastReviewDate: '2024-01-28',
                nextReviewDate: '2024-04-30',
                responsiblePerson: 'Finance Manager',
                notes: 'Submitted on time with complete documentation'
            },
            {
                complianceType: 'Environmental',
                requirement: 'Environmental Impact Assessment Update',
                status: 'pending',
                dueDate: '2024-03-15',
                lastReviewDate: null,
                nextReviewDate: '2024-03-15',
                responsiblePerson: 'Environmental Officer',
                notes: 'Awaiting final environmental review documents'
            },
            {
                complianceType: 'Cybersecurity',
                requirement: 'Cybersecurity Compliance Certification',
                status: 'compliant',
                dueDate: '2024-02-01',
                lastReviewDate: '2024-01-29',
                nextReviewDate: '2025-02-01',
                responsiblePerson: 'IT Security Lead',
                notes: 'ISO 27001 certification renewed successfully'
            },
            {
                complianceType: 'Data Protection',
                requirement: 'Data Protection Impact Assessment',
                status: 'under-review',
                dueDate: '2024-04-30',
                lastReviewDate: null,
                nextReviewDate: '2024-04-30',
                responsiblePerson: 'Data Protection Officer',
                notes: 'GDPR compliance review in progress'
            },
            {
                complianceType: 'Marketing',
                requirement: 'Marketing Campaign Compliance Report',
                status: 'non-compliant',
                dueDate: '2024-01-15',
                lastReviewDate: null,
                nextReviewDate: '2024-02-15',
                responsiblePerson: 'Marketing Director',
                notes: 'Requires immediate attention - regulatory concerns'
            },
            {
                complianceType: 'Health & Safety',
                requirement: 'Safety Standards Compliance Report',
                status: 'non-compliant',
                dueDate: '2024-02-05',
                lastReviewDate: null,
                nextReviewDate: '2024-02-20',
                responsiblePerson: 'Safety Officer',
                notes: 'Critical safety review overdue - site inspections needed'
            }
        ];

        // Clear existing compliance records
        await prisma.complianceRecord.deleteMany({});

        // Add compliance records for each partner
        let recordsAdded = 0;
        
        // For regular partners
        for (const partner of partners.slice(0, 3)) { // Limit to first 3 partners
            for (const requirement of complianceRequirements.slice(0, 2)) { // 2 requirements per partner
                await prisma.complianceRecord.create({
                    data: {
                        partnerId: partner.id,
                        partnerName: partner.partnerName, // This contains partner ID like "P-09"
                        complianceType: requirement.complianceType,
                        requirement: requirement.requirement,
                        status: requirement.status,
                        dueDate: requirement.dueDate,
                        lastReviewDate: requirement.lastReviewDate,
                        nextReviewDate: requirement.nextReviewDate,
                        responsiblePerson: requirement.responsiblePerson,
                        notes: requirement.notes
                    }
                });
                recordsAdded++;
            }
        }

        // For external partners
        for (const externalPartner of externalPartners.slice(0, 2)) { // Limit to first 2 external partners
            for (const requirement of complianceRequirements.slice(2, 4)) { // Different requirements
                await prisma.complianceRecord.create({
                    data: {
                        partnerId: externalPartner.id,
                        partnerName: externalPartner.partnerName, // This contains actual name like "OPM"
                        complianceType: requirement.complianceType,
                        requirement: requirement.requirement,
                        status: requirement.status,
                        dueDate: requirement.dueDate,
                        lastReviewDate: requirement.lastReviewDate,
                        nextReviewDate: requirement.nextReviewDate,
                        responsiblePerson: requirement.responsiblePerson,
                        notes: requirement.notes
                    }
                });
                recordsAdded++;
            }
        }

        // Add some records without specific partner IDs (general compliance)
        for (const requirement of complianceRequirements.slice(4)) {
            await prisma.complianceRecord.create({
                data: {
                    partnerId: null,
                    partnerName: 'General Compliance',
                    complianceType: requirement.complianceType,
                    requirement: requirement.requirement,
                    status: requirement.status,
                    dueDate: requirement.dueDate,
                    lastReviewDate: requirement.lastReviewDate,
                    nextReviewDate: requirement.nextReviewDate,
                    responsiblePerson: requirement.responsiblePerson,
                    notes: requirement.notes
                }
            });
            recordsAdded++;
        }

        console.log(`✅ Successfully added ${recordsAdded} compliance records`);
        console.log('📊 Records breakdown:');
        console.log(`   - Partner-specific: ${(partners.length * 2) + (externalPartners.length * 2)}`);
        console.log(`   - General compliance: ${complianceRequirements.slice(4).length}`);

    } catch (error) {
        console.error('❌ Error adding compliance records:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
addSampleComplianceData();