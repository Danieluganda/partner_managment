# Partner Management Dashboard

An interactive HTML/CSS/JavaScript dashboard for managing partners, contracts, financials, deliverables, and compliance tracking.

## Files Included

1. **partner_dashboard.html** - Main HTML file
2. **styles.css** - Stylesheet with modern, responsive design
3. **script.js** - JavaScript for interactivity and data handling
4. **dashboard_data.json** - Data extracted from your Excel files

## Features

### 📊 Dashboard Overview
- Total partners count
- Active contracts tracking
- Total budget summary
- Average utilization rate
- Visual charts and graphs
- Recent partners list

### 📋 Master Register
- Complete partner information
- Contract status tracking
- Regional operations overview
- Key personnel assignments
- Task order pricing

### 💰 Financial Summary
- Budget tracking by quarter
- Disbursement monitoring
- Utilization rate calculation
- Payment status tracking

### ✅ Deliverables Tracker
- Milestone tracking
- Submission status
- Approval dates
- Payment allocation

### 📑 Compliance & Reporting
- Reporting requirements
- Due date tracking
- Submission monitoring
- FMCS audit status

### 👥 Key Personnel Directory
- Contact information
- Role assignments
- Partner associations

## How to Use

### Option 1: Local File System
1. Download all 4 files to the same folder
2. Open `partner_dashboard.html` in any modern web browser (Chrome, Firefox, Edge, Safari)
3. The dashboard will load with your data

### Option 2: Web Server
1. Upload all files to your web server
2. Ensure all files are in the same directory
3. Access via your domain URL

### Option 3: Simple HTTP Server (Python)
```bash
# Navigate to the folder containing the files
cd /path/to/dashboard

# Start a simple server (Python 3)
python3 -m http.server 8000

# Open browser and go to:
# http://localhost:8000/partner_dashboard.html
```

## Navigation

- **Sidebar Menu**: Click on any menu item to switch between views
- **Search**: Use the global search bar to find partners across all data
- **Table Search**: Each view has its own search functionality
- **Refresh**: Click the refresh button to reload data

## Customization

### Colors
Edit `styles.css` and modify the CSS variables at the top:
```css
:root {
    --primary-color: #2563eb;  /* Main blue color */
    --secondary-color: #10b981; /* Green color */
    --danger-color: #ef4444;    /* Red color */
    /* ... etc */
}
```

### Data Updates
To update the data:
1. Modify your Excel files
2. Re-run the Python conversion script (or manually edit `dashboard_data.json`)
3. Refresh the browser

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## Responsive Design

The dashboard is fully responsive and works on:
- 💻 Desktop computers
- 📱 Tablets
- 📱 Mobile phones

## Future Enhancements

Potential features to add:
- Export to Excel/CSV functionality
- Data filtering and sorting
- Advanced charts and visualizations
- User authentication
- Real-time data updates
- Email notifications
- Document upload capability

## Technical Details

- **HTML5** - Modern semantic markup
- **CSS3** - Flexbox and Grid layouts
- **JavaScript (ES6+)** - No external dependencies
- **JSON** - Data storage format

## Support

For issues or questions:
1. Check that all 4 files are in the same folder
2. Ensure your browser supports JavaScript
3. Check browser console for error messages (F12 key)

## Data Security

⚠️ **Important**: This is a client-side application. All data is visible in the JSON file and browser. For production use with sensitive data, consider:
- Server-side authentication
- Database storage
- Encrypted connections (HTTPS)
- Access control

---

**Version**: 1.0  
**Created**: November 2025  
**License**: Use freely for your organization
