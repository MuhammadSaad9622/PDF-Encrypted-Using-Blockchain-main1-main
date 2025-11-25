# Admin Panel Setup Guide

## Creating Your First Admin User

To create an admin user, run the following command:

```bash
npm run create:admin <email> <password>
```

Example:
```bash
npm run create:admin admin@example.com admin123456
```

This will:
- Create a new admin user if the email doesn't exist
- Or upgrade an existing user to admin if the email already exists

## Accessing the Admin Panel

1. Navigate to `/admin/login` in your browser
2. Enter your admin email and password
3. You'll be redirected to the admin dashboard

## Admin Panel Features

### Dashboard Tab
- Overview statistics (Total Users, Users with Wallets, Total NFTs)
- Growth metrics (Today, This Week, This Month)
- Recent users list
- Wallet adoption rate

### Analytics Tab
- User growth chart (Last 12 months)
- Detailed user statistics
- NFT statistics
- System information

### User Management Tab
- View all users with pagination
- Search users by email, name, or wallet address
- Edit user information
- Delete users (admins cannot be deleted)
- View user details

## Admin Routes

- `/admin/login` - Admin login page
- `/admin/dashboard` - Admin dashboard (protected)

## Security Notes

- Admin tokens expire after 24 hours
- Admin routes are protected by middleware
- Only users with `role: 'admin'` can access admin routes
- Regular users cannot access admin endpoints even with a token

