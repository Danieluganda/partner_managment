// Let's create a quick fix for the DatabaseService initialization

const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    // Ensure Prisma client is always initialized
    this.prisma = new PrismaClient({
      log: ['error'],
    });
  }

  async initialize() {
    try {
      await this.prisma.$connect();
      console.log('📚 Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async getDashboardStats() {
    try {
      // Make sure this.prisma exists before using it
      if (!this.prisma) {
        console.error('Prisma client not initialized');
        return {
          partnersCount: 0,
          externalPartnersCount: 0,
          personnelCount: 0,
          deliverablesCount: 0
        };
      }

      const [partnersCount, externalPartnersCount, personnelCount, deliverablesCount] = await Promise.all([
        this.prisma.partners.count(),
        this.prisma.external_partners.count(),
        this.prisma.personnel.count(),
        this.prisma.deliverables.count()
      ]);

      return {
        partnersCount,
        externalPartnersCount,
        personnelCount,
        deliverablesCount
      };
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      return {
        partnersCount: 0,
        externalPartnersCount: 0,
        personnelCount: 0,
        deliverablesCount: 0
      };
    }
  }

  async getPartners() {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.partners.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching partners:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}

module.exports = DatabaseService;

// In app.js around line 1099, make sure it's something like:
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Make sure db is properly initialized
    if (!req.app.locals.db) {
      req.app.locals.db = new DatabaseService();
      await req.app.locals.db.initialize();
    }
    
    const stats = await req.app.locals.db.getDashboardStats();
    // ... rest of the code
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', { 
      error: 'Failed to load dashboard data',
      // ... default values
    });
  }
});