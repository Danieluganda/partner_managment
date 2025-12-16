# Partner Management Dashboard

A comprehensive Node.js web application for managing partner relationships, contracts, and external partnerships with a modern database-driven architecture.

## 🚀 Features

### Core Functionality
- **Partner Management** - Complete CRUD operations for partner data
- **External Partnership Pipeline** - Track partnership development stages
- **Financial Tracking** - Monitor contract values and budget allocation
- **Deliverables Management** - Track project deliverables and deadlines
- **Compliance Monitoring** - Ensure regulatory compliance
- **Personnel Directory** - Key contacts and team management
- **Dashboard Analytics** - Real-time insights and statistics

### Technical Features
- **Database Persistence** - SQLite with Prisma ORM
- **RESTful API** - Complete API endpoints for all entities
- **Responsive Design** - Mobile-friendly interface
- **Form Validation** - Client and server-side validation
- **Search Functionality** - Advanced partner search capabilities
- **Audit Trail** - Activity logging for all operations

## 🛠️ Technology Stack

- **Backend:** Node.js with Express.js 4.18.2
- **Database:** SQLite with Prisma ORM 6.19.0
- **Frontend:** EJS templating engine
- **Styling:** Modular CSS architecture
- **Validation:** Express-validator
- **Environment:** dotenv for configuration

## 📁 Project Structure

```
kulg/
├── app.js                 # Main application server
├── package.json           # Dependencies and scripts
├── prisma.config.ts       # Prisma configuration
├── .env                   # Environment variables
├── inspect-db.js          # Database inspection utility
├── view-all-data.js       # Data viewing utility
├── models/                # Data model classes
│   ├── Partner.js
│   ├── ExternalPartner.js
│   └── Financial.js
├── services/              # Business logic layer
│   ├── DatabaseService.js # Database abstraction
│   └── DataService.js     # Legacy JSON service
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Database schema definition
│   ├── dev.db            # SQLite database file
│   └── migrations/        # Database migration history
├── views/                 # EJS templates
│   ├── dashboard.ejs
│   ├── master-register.ejs
│   ├── financial-summary.ejs
│   ├── deliverables-tracker.ejs
│   ├── compliance-reporting.ejs
│   ├── key-personnel.ejs
│   ├── external-partners.ejs
│   ├── forms/            # Form templates
│   │   ├── partner-form.ejs
│   │   └── external-partner-form.ejs
│   └── partials/         # Reusable components
│       ├── header.ejs
│       ├── sidebar.ejs
│       └── footer.ejs
├── public/               # Static assets
│   ├── css/             # Stylesheets
│   │   ├── dashboard.css
│   │   ├── forms/       # Form-specific styles
│   │   └── components/  # Component styles
│   └── js/              # Client-side JavaScript
│       ├── dashboard.js
│       └── forms/       # Form validation scripts
└── home/                # Static documentation
    ├── dashboard_data.json
    └── README.md
```

## 🗄️ Database Schema

### Core Tables
- **Partners** - Main partner registry
- **ExternalPartners** - Partnership pipeline tracking
- **FinancialRecords** - Contract and budget data
- **Personnel** - Key contacts directory
- **Deliverables** - Project deliverables tracking
- **ComplianceRecords** - Regulatory compliance
- **Users** - User authentication (future)
- **ActivityLogs** - Audit trail

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Danieluganda/device_forms.git
   cd kulg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   echo 'DATABASE_URL="file:./dev.db"' > .env
   ```

4. **Initialize database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev --name init
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Dashboard: http://localhost:3000/dashboard
   - API: http://localhost:3000/api/
   - Database Studio: http://localhost:5555 (run `npx prisma studio`)

## 📊 Database Management

### Inspect Database
```bash
# Quick database overview
node inspect-db.js

# Detailed data view
node view-all-data.js

# Visual database browser
npx prisma studio
```

### Database Operations
```bash
# Reset database
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database status
npx prisma migrate status
```

## 🔗 API Endpoints

### Partners
- `GET /api/partners` - List all partners
- `POST /api/partners` - Create new partner
- `GET /api/partners/:id` - Get partner by ID
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Delete partner

### External Partners
- `GET /api/external-partners` - List external partners
- `POST /api/external-partners` - Create external partner
- `GET /api/external-partners/:id` - Get external partner by ID
- `PUT /api/external-partners/:id` - Update external partner
- `DELETE /api/external-partners/:id` - Delete external partner

### Utility Endpoints
- `GET /api/stats` - Dashboard statistics
- `GET /api/search?q=term` - Search partners
- `GET /api/health` - Health check
- `GET /api/financial` - Financial data

## 🎨 Page Routes

### Main Pages
- `/` - Login page (index)
- `/dashboard` - Main dashboard with analytics
- `/master-register` - Partner registry
- `/financial-summary` - Financial overview
- `/deliverables-tracker` - Project deliverables
- `/compliance-reporting` - Compliance monitoring
- `/key-personnel` - Personnel directory
- `/external-partners` - Partnership pipeline

### Forms
- `/forms/partner` - Add new partner
- `/forms/partner/:id/edit` - Edit partner
- `/forms/external-partner` - Add external partner
- `/forms/external-partner/:id/edit` - Edit external partner

## 🔧 Development

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server (if nodemon installed)
npm test           # Run tests (to be implemented)
```

### Database Scripts
```bash
# Database inspection
npm run inspect-db # node inspect-db.js
npm run view-data  # node view-all-data.js

# Prisma operations
npm run db:studio  # npx prisma studio
npm run db:reset   # npx prisma migrate reset
npm run db:migrate # npx prisma migrate dev
```

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=3000
NODE_ENV=development

# Security (future use)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

## 🎯 Usage Examples

### Adding a New Partner
1. Navigate to `/forms/partner`
2. Fill in required fields (Partner Name, Type, Contact Email)
3. Submit form - data is automatically saved to database

### Viewing Partner Data
1. Visit `/master-register` for tabular view
2. Use `/api/partners` for JSON data
3. Open Prisma Studio for visual database management

### Searching Partners
- Use the search functionality on the dashboard
- API endpoint: `/api/search?q=search_term`

## 🔍 Monitoring & Debugging

### Health Checks
- Application health: http://localhost:3000/api/health
- Database status: Check logs or Prisma Studio

### Logs
- Application logs appear in console
- Database queries logged by Prisma

### Common Issues
1. **Port 3000 in use**: Kill existing process or change PORT in .env
2. **Database errors**: Run `npx prisma migrate dev`
3. **Missing dependencies**: Run `npm install`

## 📈 Future Enhancements

### Planned Features
- [ ] User authentication and authorization
- [ ] Advanced reporting and analytics
- [ ] Email notifications for deliverables
- [ ] Document management system
- [ ] API rate limiting and security
- [ ] Data export functionality
- [ ] Advanced search filters
- [ ] Bulk operations
- [ ] Integration with external systems

### Technical Improvements
- [ ] Unit and integration tests
- [ ] Docker containerization
- [ ] Production deployment scripts
- [ ] Automated backups
- [ ] Performance monitoring
- [ ] Security hardening

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Daniel Uganda** - Initial development and architecture

## 🙏 Acknowledgments

- Express.js community for the robust web framework
- Prisma team for the excellent ORM
- SQLite for the reliable database engine
- All contributors and testers

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: daniel.bn1800@gmail.com

---

**Built with ❤️ for efficient partner management**