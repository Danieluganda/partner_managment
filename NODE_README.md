# Partner Dashboard Node.js Application

## 🚀 Quick Start

This Node.js application provides a web-based interface for the Partner Dashboard, matching the original HTML design with enhanced functionality.

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Or start in production mode
npm start
```

### Access the Application

- **Main Landing Page**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **API Endpoints**: http://localhost:3000/api/*

## 📁 Project Structure

```
├── app.js                 # Main Express server
├── package.json          # Dependencies and scripts
├── dashboard_data.json   # Data source
├── views/               # EJS templates
│   ├── index.ejs       # Landing page
│   ├── dashboard.ejs   # Main dashboard
│   ├── 404.ejs        # 404 error page
│   └── error.ejs      # Error page
├── public/             # Static assets
│   ├── css/
│   │   ├── style.css      # Landing page styles
│   │   └── dashboard.css  # Dashboard styles
│   └── js/
│       ├── main.js        # Landing page JavaScript
│       └── dashboard.js   # Dashboard JavaScript
```

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/partners` | GET | All partner data from master register |
| `/api/financial` | GET | Financial summary data |
| `/api/external-partners` | GET | External partners information |
| `/api/stats` | GET | Dashboard statistics |

## 🎨 Features

### Landing Page (/)
- Matches original HTML design
- Dynamic statistics from data
- API endpoint documentation
- Responsive design

### Dashboard (/dashboard)
- Multi-tab interface (Overview, Partners, Financial, External Partners)
- Interactive data tables
- Real-time statistics
- Search and filter functionality
- Responsive charts (simple CSS-based)

### API Integration
- RESTful endpoints for all data
- CORS enabled for external access
- JSON responses
- Error handling

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Templating**: EJS (Embedded JavaScript)
- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox
- **Data**: JSON file-based storage
- **Styling**: CSS3 with gradients and animations

## 📊 Data Structure

The application reads from `dashboard_data.json` which contains:
- `masterRegister`: Main partner information
- `financialSummary`: Financial tracking data
- `keyPersonnel`: Contact information
- `deliverables`: Project deliverables
- `compliance`: Reporting requirements
- `externalPartners`: External partnership data

## 🔧 Customization

### Adding New Views
1. Create new EJS template in `views/`
2. Add route in `app.js`
3. Create corresponding CSS/JS in `public/`

### Styling Changes
- Modify `public/css/style.css` for landing page
- Modify `public/css/dashboard.css` for dashboard
- Both files maintain the original design system

### Adding API Endpoints
Add new routes in `app.js`:

```javascript
app.get('/api/new-endpoint', (req, res) => {
    res.json({ data: 'your-data' });
});
```

## 🚨 Error Handling

- 404 pages with branded design
- Server error pages
- API error responses
- Graceful data loading fallbacks

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: 768px (tablet), 480px (mobile)
- Flexible grid layouts
- Touch-friendly interfaces

## 🔄 Real-time Features

- Auto-updating statistics (30-second intervals)
- Animated number changes
- Live data synchronization
- Progressive enhancement

## 📈 Performance

- Static asset serving
- Efficient data loading
- Minimal JavaScript dependencies
- CSS-only animations where possible

## 🔒 Security

- CORS configuration
- Input validation
- Error message sanitization
- No sensitive data exposure

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

**Ready to use!** Start the server and navigate to http://localhost:3000 to begin.