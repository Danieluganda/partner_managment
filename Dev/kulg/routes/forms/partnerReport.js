const express = require('express');
const router = express.Router();
const DatabaseService = require('../../services/DatabaseService');
const databaseService = new DatabaseService();

// GET /forms/partner/:id/report
router.get('/forms/partner/:id/report', async (req, res) => {
    try {
        const partnerId = req.params.id;
        console.log(`[REPORT ROUTE] Requested partnerId: ${partnerId}`);

        // Check if partnerId is valid format (UUID)
        if (!partnerId || typeof partnerId !== 'string' || partnerId.length < 10) {
            console.log(`[REPORT ROUTE] Invalid partnerId format:`, partnerId);
        }

        const partner = await databaseService.getPartnerById(partnerId);
        if (!partner) {
            console.log(`[REPORT ROUTE] No partner found for ID: ${partnerId}`);
            return res.status(404).render('404', { title: 'Partner Not Found' });
        }
        console.log(`[REPORT ROUTE] Partner found:`, partner);

        // Fetch all required data for the report (replace with your actual data fetching)
        const financialMetrics = await databaseService.getFinancialMetrics(partnerId);
        const budgetUtilization = await databaseService.getBudgetUtilization(partnerId);
        const quarterlyReports = await databaseService.getQuarterlyReports(partnerId);
        const deliverables = await databaseService.getDeliverablesForPartner(partnerId);
        const complianceCards = await databaseService.getComplianceCards(partnerId);
        const reportingRequirements = await databaseService.getReportingRequirements(partnerId);
        const performanceMetrics = await databaseService.getPerformanceMetrics(partnerId);
        const keyPersonnel = await databaseService.getKeyPersonnel(partnerId);

        // Other fields (replace with your actual logic)
        const executiveSummary = await databaseService.getExecutiveSummary(partnerId);
        const keyAchievements = await databaseService.getKeyAchievements(partnerId);
        const areasForAttention = await databaseService.getAreasForAttention(partnerId);
        const personnelNote = await databaseService.getPersonnelNote(partnerId);
        const communicationCollaboration = await databaseService.getCommunicationCollaboration(partnerId);
        const recommendations = await databaseService.getRecommendations(partnerId);

        // Footer/meta
        const generatedDate = new Date().toLocaleString();
        const footerConfidential = "Confidential - For internal use only";
        const footerDataSource = "Data Source: Partner Management System";
        const footerContact = "Contact: partnerships@example.com";
        const reportTitle = "Comprehensive Partnership Report";
        const reportDate = new Date().toLocaleDateString();

        console.log(`[REPORT ROUTE] Rendering report for partnerId: ${partnerId}`);

        res.render('forms/partner_report', {
            partner,
            financialMetrics,
            budgetUtilization,
            quarterlyReports,
            deliverables,
            complianceCards,
            reportingRequirements,
            performanceMetrics,
            
            keyPersonnel,
            executiveSummary,
            keyAchievements,
            areasForAttention,
            personnelNote,
            communicationCollaboration,
            recommendations,
            generatedDate,
            footerConfidential,
            footerDataSource,
            footerContact,
            reportTitle,
            reportDate
        });
    } catch (error) {
        console.error(`[REPORT ROUTE] Error:`, error);
        res.status(500).render('error', { error });
    }
});

module.exports = router;