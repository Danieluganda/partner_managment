const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

class ESODataUpdater {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async updateESOData() {
        try {
            console.log('🔄 Starting ESO data update...');

            // First, clear existing dummy data
            await this.clearExistingData();

            // Parse and insert new ESO data
            await this.insertESOData();

            console.log('✅ ESO data update completed successfully!');
        } catch (error) {
            console.error('❌ Error updating ESO data:', error);
            throw error;
        } finally {
            await this.prisma.$disconnect();
        }
    }

    async clearExistingData() {
        console.log('🗑️ Clearing existing dummy data...');
        
        // Clear related tables first (if they exist)
        await this.prisma.contacts.deleteMany({});
        await this.prisma.esos.deleteMany({});
        
        console.log('✅ Existing data cleared');
    }

    async insertESOData() {
        console.log('📝 Inserting new ESO data...');

        const esoData = [
            {
                name: "Challenges Uganda",
                contacts: [
                    { name: "Obedi David Onene", phone: "0772169038", email: "obedidavid.onen@thechallengesgroup.com" },
                    { name: "Hendricah Nabukwasi", phone: "0753289351", email: "hendricah.nabukwasi@thechallengesgroup.com" },
                    { name: "Christine Iyura", phone: "0784240210", email: "christine.iyura@thechallengesgroup.com" },
                    { name: "Victory M Nabakooza", phone: "", email: "victory.mugenyi@thechallengesgroup.com" }
                ],
                lotOfOperation: "Lot 4: (Acholi region) Lamwo, Kitgum, Nwoya, Gulu, Omoro, Agago, and Pader."
            },
            {
                name: "DFCU Foundation",
                contacts: [
                    { name: "Aaron Chandia", phone: "0777534455", email: "Aaron.Chandia@dfcu.com" },
                    { name: "Ikaaba Daniel", phone: "0784264444", email: "dikaaba@dfcugroup.com" },
                    { name: "Mable Ndawula", phone: "769412734", email: "Mndawula@dfcugroup.com" }
                ],
                lotOfOperation: "Lot 3: (Karamoja region) Nakapiripirit; (Bukedi region) Busia, Tororo, Pallisa, Kibuku and Budaka; (Elgon region) Bulambuli, Kween, Kapchorwa, Mbale, Sironko, Bukwo, Bududa, Manafwa and Namisindwa"
            },
            {
                name: "Excel Hort",
                contacts: [
                    { name: "Bazitire Grace", phone: "0772699268", email: "gbazitire@excelhort.com" },
                    { name: "Twinobusingye Fred", phone: "0772591662", email: "ftwinobusingye@excelhort.com" },
                    { name: "Charles Makingu", phone: "0782600174", email: "clmalingu@excelhort.com" }
                ],
                lotOfOperation: "Lot 2: (Bunyoro region) Kiryandongo; (Tooro region) Kyaka, Rwamanja; (Ankole region) Nakivaale"
            },
            {
                name: "Finding XY",
                contacts: [
                    { name: "Fredrick Mpaata", phone: "774441570", email: "Fredrick.mpaata@findingxy.com" },
                    { name: "Merab Twinomugisha", phone: "0774087368", email: "merab.twinomugisha@findingxy.com" },
                    { name: "Lawrence Ssentongo", phone: "0772511706", email: "Lawrence.ssentongo@findingxy.com" }
                ],
                lotOfOperation: "Lot 4: (Teso region) Katakwi, Soroti, Amuria, Serere, Ngora and Bukedea; (Acholi region) Lamwo, Kitgum, Nwoya, Gulu, Omoro, Agago, and Pader"
            },
            {
                name: "Mkazipreneur",
                contacts: [
                    { name: "Immaculate Nakyeyune", phone: "0779262551", email: "immy@mkazipreneur.org" },
                    { name: "Nanyonjo Janet", phone: "0780235352", email: "nanyonjojanet@mkazipreneur.org" }
                ],
                lotOfOperation: "Lot 1: (Buganda North) Nakasongola, Nakaseke, Luweero, Kiboga, Mukono, Buikwe, Wakiso and Kampala."
            },
            {
                name: "MUBS",
                contacts: [
                    { name: "Charles Opolot", phone: "0704743039", email: "entre-shipcentre@mubs.ac.ug" }
                ],
                lotOfOperation: "Lot 3: (Karamoja region) Nakapiripirit; (Bukedi region) Busia, Tororo, Pallisa, Kibuku and Budaka; (Elgon region) Bulambuli, Kween, Kapchorwa, Mbale, Sironko, Bukwo, Bududa, Manafwa and Namisindwa"
            },
            {
                name: "PEPN",
                contacts: [
                    { name: "Irene Mutumba", phone: "0772654175", email: "irene@pedn.org" },
                    { name: "Joy Mukisa", phone: "0772692683", email: "joy@pedn.org" }
                ],
                lotOfOperation: "Lot 1: (Buganda North) Nakasongola, Nakaseke, Luweero, Kiboga, Mukono, Buikwe, Wakiso and Kampala."
            },
            {
                name: "Stanbic",
                contacts: [
                    { name: "Vanessa Mirembe", phone: "", email: "mirembev2@stanbic.com" },
                    { name: "Ankunda Anthea", phone: "", email: "ankundaa@stanbic.com" }
                ],
                lotOfOperation: "Lot 1: (Buganda North) Nakasongola, Nakaseke, Luweero, Kiboga, Mukono, Buikwe, Wakiso and Kampala."
            }
        ];

        for (const esoInfo of esoData) {
            console.log(`📝 Creating ESO: ${esoInfo.name}`);
            
            // Create ESO
            const eso = await this.prisma.esos.create({
                data: {
                    name: esoInfo.name,
                    lotOfOperation: esoInfo.lotOfOperation,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // Create contacts for this ESO
            for (const contactInfo of esoInfo.contacts) {
                if (contactInfo.name && contactInfo.email) {
                    await this.prisma.contacts.create({
                        data: {
                            name: contactInfo.name,
                            phone: contactInfo.phone || null,
                            email: contactInfo.email,
                            esoId: eso.id,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                    console.log(`  ✅ Added contact: ${contactInfo.name}`);
                }
            }
        }

        console.log('✅ All ESO data inserted successfully');
    }
}

// Run the update
async function runUpdate() {
    const updater = new ESODataUpdater();
    try {
        await updater.updateESOData();
        console.log('🎉 Database update completed!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Update failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    runUpdate();
}

module.exports = ESODataUpdater;