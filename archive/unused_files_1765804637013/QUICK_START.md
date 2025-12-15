# 🚀 Quick Start Guide

Get your Partner Management Dashboard running in 5 minutes!

## Prerequisites
- Node.js 16+ installed
- Git installed

## 1. Clone & Install
```bash
git clone https://github.com/Danieluganda/device_forms.git
cd kulg
npm install
```

## 2. Setup Database
```bash
# Create environment file
echo 'DATABASE_URL="file:./dev.db"' > .env

# Initialize database
npx prisma generate
npx prisma migrate dev --name init
```

## 3. Start Application
```bash
npm start
```

## 4. Access Application
- **Dashboard:** http://localhost:3000/dashboard
- **Add Partner:** http://localhost:3000/forms/partner
- **Database Studio:** Run `npx prisma studio` then visit http://localhost:5555

## 5. Test Features
1. **Create a Partner:**
   - Go to http://localhost:3000/forms/partner
   - Fill in: Partner Name, Type, Contact Email
   - Submit form

2. **View Data:**
   - Dashboard: http://localhost:3000/dashboard
   - Partner List: http://localhost:3000/master-register
   - API: http://localhost:3000/api/partners

3. **Database Management:**
   ```bash
   npm run inspect-db    # Quick overview
   npm run view-data     # Detailed view
   npm run db:studio     # Visual browser
   ```

## Troubleshooting
- **Port 3000 in use:** Change PORT in .env or kill existing process
- **Database errors:** Run `npm run db:reset` then `npm run db:migrate`
- **Missing packages:** Run `npm install`

## Next Steps
- Explore all pages via the sidebar navigation
- Add external partners at `/forms/external-partner`
- Check API endpoints at `/api/`
- Review the full README.md for detailed documentation

**Happy Partner Managing! 🎉**