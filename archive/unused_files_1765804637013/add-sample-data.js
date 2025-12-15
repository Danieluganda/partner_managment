const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleData() {
    try {
        console.log('📚 Database connected successfully');

        // Add some realistic partner data
        const partnersToAdd = [
            {
                partnerName: 'TechCorp Solutions',
                contractStatus: 'Signed',
                commencementDate: '2024-02-01',
                regionsOfOperation: 'East Africa, West Africa',
                keyPersonnel: 'Sarah Johnson, Michael Chen',
                taskOrderPrice: '$150,000',
                partnerType: 'Technology',
                contactEmail: 'contact@techcorp.com',
                contactPhone: '+256-700-123456',
                contractValue: '$450,000',
                contractStartDate: '2024-02-01',
                contractEndDate: '2027-02-01',
                contractDuration: '3 years'
            },
            {
                partnerName: 'Global Health Initiative',
                contractStatus: 'Signed',
                commencementDate: '2024-04-01',
                regionsOfOperation: 'Central Africa',
                keyPersonnel: 'Dr. James Wilson, Mary Torres',
                taskOrderPrice: '$200,000',
                partnerType: 'Healthcare',
                contactEmail: 'info@globalhealthinit.org',
                contactPhone: '+256-701-234567',
                contractValue: '$400,000',
                contractStartDate: '2024-04-01',
                contractEndDate: '2026-04-01',
                contractDuration: '2 years'
            },
            {
                partnerName: 'Education Access Foundation',
                contractStatus: 'In Contracting',
                commencementDate: null,
                regionsOfOperation: 'Uganda, Kenya, Tanzania',
                keyPersonnel: 'Prof. Alice Namara, David Kim',
                taskOrderPrice: '$300,000',
                partnerType: 'Education',
                contactEmail: 'partnerships@educationaccess.org',
                contactPhone: '+256-702-345678',
                contractValue: '$1,200,000',
                contractStartDate: '2024-09-01',
                contractEndDate: '2028-09-01',
                contractDuration: '4 years'
            },
            {
                partnerName: 'Green Energy Consortium',
                contractStatus: 'Signed',
                commencementDate: '2024-03-15',
                regionsOfOperation: 'Southern Africa, East Africa',
                keyPersonnel: 'Robert Green, Jennifer Smith',
                taskOrderPrice: '$500,000',
                partnerType: 'Environment',
                contactEmail: 'contact@greenenergy.com',
                contactPhone: '+256-703-456789',
                contractValue: '$2,500,000',
                contractStartDate: '2024-03-15',
                contractEndDate: '2029-03-15',
                contractDuration: '5 years'
            },
            {
                partnerName: 'Financial Inclusion Network',
                contractStatus: 'In Contracting',
                commencementDate: null,
                regionsOfOperation: 'West Africa',
                keyPersonnel: 'Lisa Martinez, Ahmed Hassan',
                taskOrderPrice: '$180,000',
                partnerType: 'Financial Services',
                contactEmail: 'partnerships@fininclusion.org',
                contactPhone: '+256-704-567890',
                contractValue: '$540,000',
                contractStartDate: '2024-08-01',
                contractEndDate: '2027-08-01',
                contractDuration: '3 years'
            }
        ];

        for (const partner of partnersToAdd) {
            await prisma.partner.create({ data: partner });
            console.log(`✅ Added partner: ${partner.partnerName}`);
        }

        // Add some financial data to FinancialRecord table
        const financialData = [
            {
                partnerName: 'TechCorp Solutions',
                contractValue: '$450,000',
                budgetAllocated: '$150,000',
                actualSpent: '$45,000',
                remainingBudget: '$105,000',
                financialStatus: 'on-budget'
            },
            {
                partnerName: 'Global Health Initiative',
                contractValue: '$400,000',
                budgetAllocated: '$200,000',
                actualSpent: '$80,000',
                remainingBudget: '$120,000',
                financialStatus: 'on-budget'
            },
            {
                partnerName: 'Green Energy Consortium',
                contractValue: '$2,500,000',
                budgetAllocated: '$500,000',
                actualSpent: '$150,000',
                remainingBudget: '$350,000',
                financialStatus: 'on-budget'
            },
            {
                partnerName: 'Education Access Foundation',
                contractValue: '$1,200,000',
                budgetAllocated: '$300,000',
                actualSpent: '$0',
                remainingBudget: '$300,000',
                financialStatus: 'on-budget'
            },
            {
                partnerName: 'Financial Inclusion Network',
                contractValue: '$540,000',
                budgetAllocated: '$180,000',
                actualSpent: '$0',
                remainingBudget: '$180,000',
                financialStatus: 'on-budget'
            }
        ];

        for (const financial of financialData) {
            await prisma.financialRecord.create({ data: financial });
            console.log(`💰 Added financial record for: ${financial.partnerName}`);
        }

        // Update some existing external partners with better data
        const externalUpdates = [
            {
                name: 'Numida',
                updates: {
                    partnerName: 'Numida Financial Services',
                    partnerType: 'fintech',
                    keyContact: 'John Mugisha',
                    contactEmail: 'partnerships@numida.com',
                    contactPhone: '+256-705-123456',
                    currentStage: 'implementation',
                    status: 'on-track',
                    keyObjectives: 'Expand digital lending services to rural communities',
                    responsible: 'Sarah Williams',
                    priority: 'high',
                    dateInitiated: '2024-01-15'
                }
            },
            {
                name: 'Mogo',
                updates: {
                    partnerName: 'Mogo Auto Finance',
                    partnerType: 'fintech',
                    keyContact: 'Peter Kiprotich',
                    contactEmail: 'business@mogo.co.ug',
                    contactPhone: '+256-706-234567',
                    currentStage: 'contract-review',
                    status: 'on-track',
                    keyObjectives: 'Develop vehicle financing solutions for SMEs',
                    responsible: 'Michael Torres',
                    priority: 'medium',
                    dateInitiated: '2024-02-20'
                }
            }
        ];

        for (const update of externalUpdates) {
            const existing = await prisma.externalPartner.findFirst({
                where: { partnerName: { contains: update.name } }
            });
            
            if (existing) {
                await prisma.externalPartner.update({
                    where: { id: existing.id },
                    data: update.updates
                });
                console.log(`🔄 Updated external partner: ${update.name}`);
            }
        }

        console.log('\n🎉 Sample data added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding sample data:', error);
    } finally {
        await prisma.$disconnect();
        console.log('📚 Database disconnected');
    }
}

addSampleData();