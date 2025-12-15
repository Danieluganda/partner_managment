const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

class ESOMasterRegisterIntegrator {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async integrateESOs() {
        try {
            console.log('🔄 Starting ESO integration into master register...');

            // Get all ESOs and their contacts
            const esos = await this.prisma.esos.findMany({
                include: {
                    contacts: true
                }
            });

            console.log(`📊 Found ${esos.length} ESOs to integrate into master register`);

            // Process each ESO
            for (const eso of esos) {
                await this.addESOToMasterRegister(eso);
            }

            console.log('✅ ESO integration to master register completed successfully!');
            
            // Verify the integration
            await this.verifyIntegration();

        } catch (error) {
            console.error('❌ Error integrating ESOs to master register:', error);
            throw error;
        } finally {
            await this.prisma.$disconnect();
        }
    }

    async addESOToMasterRegister(eso) {
        console.log(`📝 Adding ESO to master register: ${eso.name}`);

        // Extract region information from lot of operation
        const regionsOfOperation = this.extractRegions(eso.lotOfOperation);
        
        // Get primary contact
        const primaryContact = eso.contacts[0];
        
        // Create comprehensive key personnel string
        const keyPersonnelList = eso.contacts.map(contact => {
            return `${contact.name} (${contact.email}${contact.phone ? ', ' + contact.phone : ''})`;
        }).join('; ');

        // Create partner record in master register
        const partner = await this.prisma.partners.create({
            data: {
                id: uuidv4(),
                partnerName: eso.name,
                partnerType: 'ESO',
                contactEmail: primaryContact?.email || '',
                contactPhone: primaryContact?.phone || '',
                keyPersonnel: keyPersonnelList, // All contacts as key personnel
                regionsOfOperation: regionsOfOperation,
                contractStatus: 'Active',
                commencementDate: eso.createdAt.toISOString().split('T')[0],
                createdAt: eso.createdAt,
                updatedAt: eso.updatedAt,
                comments: `Enterprise Support Organization - ${eso.lotOfOperation}`,
                // ESO specific fields
                taskOrderPrice: 'TBD',
                contractDuration: 'Ongoing',
                financialStatus: 'Active'
            }
        });

        console.log(`  ✅ Added to master register: ${eso.name}`);

        // Create detailed personnel records for each contact
        for (let i = 0; i < eso.contacts.length; i++) {
            const contact = eso.contacts[i];
            await this.createPersonnelRecord(contact, partner, i === 0); // First contact is primary
        }

        return partner;
    }

    async createPersonnelRecord(contact, partner, isPrimary = false) {
        const jobTitle = isPrimary ? 'Primary Contact Person' : 'Contact Person';
        
        const personnel = await this.prisma.personnel.create({
            data: {
                id: uuidv4(),
                partnerType: 'ESO',
                partnerId: partner.id,
                partnerName: partner.partnerName,
                partnerStatus: 'Active',
                fullName: contact.name,
                jobTitle: jobTitle,
                department: 'Operations',
                seniority: isPrimary ? 'Senior' : 'Standard',
                emailAddress: contact.email,
                phoneNumber: contact.phone || '',
                workStatus: 'Active',
                preferredContact: 'Email',
                responsibilities: `ESO contact person for ${partner.regionsOfOperation}`,
                projectAssignments: `Lot operations: ${partner.comments}`,
                skills: 'Partner coordination, Project management',
                notes: isPrimary ? 'Primary contact for this ESO partner' : 'Secondary contact for this ESO partner',
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt
            }
        });

        console.log(`    ✅ Added personnel: ${contact.name} (${jobTitle})`);
        return personnel;
    }

    extractRegions(lotOfOperation) {
        // Extract specific regions and districts
        const regions = new Set();
        
        // Region mapping
        const regionMappings = {
            'Acholi': ['Lamwo', 'Kitgum', 'Nwoya', 'Gulu', 'Omoro', 'Agago', 'Pader'],
            'Karamoja': ['Nakapiripirit'],
            'Bukedi': ['Busia', 'Tororo', 'Pallisa', 'Kibuku', 'Budaka'],
            'Elgon': ['Bulambuli', 'Kween', 'Kapchorwa', 'Mbale', 'Sironko', 'Bukwo', 'Bududa', 'Manafwa', 'Namisindwa'],
            'Bunyoro': ['Kiryandongo'],
            'Tooro': ['Kyaka', 'Rwamanja'],
            'Ankole': ['Nakivaale'],
            'Teso': ['Katakwi', 'Soroti', 'Amuria', 'Serere', 'Ngora', 'Bukedea'],
            'Buganda North': ['Nakasongola', 'Nakaseke', 'Luweero', 'Kiboga', 'Mukono', 'Buikwe', 'Wakiso', 'Kampala']
        };

        // Check which regions are mentioned
        for (const [region, districts] of Object.entries(regionMappings)) {
            if (lotOfOperation.toLowerCase().includes(region.toLowerCase()) || 
                districts.some(district => lotOfOperation.toLowerCase().includes(district.toLowerCase()))) {
                regions.add(region);
            }
        }

        return regions.size > 0 ? Array.from(regions).join(', ') : 'Multiple Regions';
    }

    async verifyIntegration() {
        console.log('\n🔍 Verifying integration...');
        
        // Count ESO partners in master register
        const esoPartners = await this.prisma.partners.count({
            where: { partnerType: 'ESO' }
        });

        // Count ESO personnel
        const esoPersonnel = await this.prisma.personnel.count({
            where: { partnerType: 'ESO' }
        });

        console.log(`✅ Integration verified:`);
        console.log(`   📊 ESO Partners in Master Register: ${esoPartners}`);
        console.log(`   👥 ESO Personnel Records: ${esoPersonnel}`);

        // Show sample data
        const samplePartner = await this.prisma.partners.findFirst({
            where: { partnerType: 'ESO' },
            include: {
                // Get related personnel if you have the relation set up
            }
        });

        if (samplePartner) {
            console.log(`   📋 Sample Partner: ${samplePartner.partnerName}`);
            console.log(`   🎯 Key Personnel: ${samplePartner.keyPersonnel?.substring(0, 100)}...`);
        }
    }

    async cleanupTemporaryTables() {
        console.log('\n🧹 Cleaning up temporary ESO tables...');
        
        try {
            await this.prisma.contacts.deleteMany({});
            await this.prisma.esos.deleteMany({});
            console.log('✅ Temporary ESO data cleaned up');
        } catch (error) {
            console.log('ℹ️ Temporary tables may have been already cleaned up');
        }
    }
}

// Run the integration
async function runIntegration() {
    const integrator = new ESOMasterRegisterIntegrator();
    try {
        await integrator.integrateESOs();
        
        console.log('\n🤔 Would you like to clean up the temporary ESO tables? (y/n)');
        console.log('   (This will remove the separate esos and contacts tables)');
        
        // For now, just show the option - in production you'd handle user input
        // await integrator.cleanupTemporaryTables();
        
        console.log('🎉 ESO master register integration completed!');
        console.log('💡 Check your master register - ESOs should now appear as partners with type "ESO"');
        
        process.exit(0);
    } catch (error) {
        console.error('💥 Integration failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    runIntegration();
}

module.exports = ESOMasterRegisterIntegrator;