// Update the users route to use the correct table

// Get all users for admin panel
router.get('/users', async (req, res) => {
  try {
    const authService = new (require('../services/AuthService'))();
    const users = await authService.getAllUsers();
    
    res.render('admin-users', { 
      users,
      pageTitle: 'User Management',
      message: req.query.message,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('admin-users', { 
      users: [],
      pageTitle: 'User Management',
      error: 'Failed to load users'
    });
  }
});

// Toggle user role
router.post('/users/:id/toggle-role', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.users.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.redirect('/admin/users?error=User not found');
    }

    // Prevent modifying super admin
    if (user.email === 'daniel.bn1800@gmail.com' && user.username === 'Super user') {
      return res.redirect('/admin/users?error=Cannot modify super admin');
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';

    await prisma.users.update({
      where: { id: req.params.id },
      data: { role: newRole }
    });

    await prisma.$disconnect();
    res.redirect('/admin/users?message=User role updated successfully');
  } catch (error) {
    console.error('Error updating user role:', error);
    res.redirect('/admin/users?error=Failed to update user role');
  }
});

// Toggle user status
router.post('/users/:id/toggle-status', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.users.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.redirect('/admin/users?error=User not found');
    }

    // Prevent modifying super admin
    if (user.email === 'daniel.bn1800@gmail.com' && user.username === 'Super user') {
      return res.redirect('/admin/users?error=Cannot modify super admin');
    }

    await prisma.users.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive }
    });

    await prisma.$disconnect();
    res.redirect('/admin/users?message=User status updated successfully');
  } catch (error) {
    console.error('Error updating user status:', error);
    res.redirect('/admin/users?error=Failed to update user status');
  }
});