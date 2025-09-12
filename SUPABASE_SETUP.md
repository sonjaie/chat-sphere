# Supabase Setup Instructions

This project has been migrated from Laravel backend to Supabase. Follow these steps to set up your Supabase database.

## 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note down your project URL and API keys

## 2. Run Database Schema

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` into the SQL editor
4. Run the SQL to create all tables, indexes, and Row Level Security policies

## 3. Update Configuration

The Supabase configuration is already set up in `src/lib/supabase.ts` with your provided credentials:

- Project URL: `https://tnvkyuqobuzrgsumuxtc.supabase.co`
- Anon Key: `sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc`

## 4. Enable Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Enable Email authentication
3. Configure email templates if needed
4. Set up email confirmation if desired

## 5. Configure Storage (Optional)

If you want to support file uploads for messages and profile pictures:

1. Go to Storage in your Supabase dashboard
2. Create buckets:
   - `avatars` for profile pictures
   - `chat-files` for message attachments
   - `stories` for story media

## 6. Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=https://tnvkyuqobuzrgsumuxtc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
```

## 7. Features Included

### Authentication
- User registration and login
- Email verification
- Password reset
- Session management

### Real-time Features
- Real-time message updates
- Real-time chat list updates
- Real-time story updates
- User status tracking

### Database Features
- Row Level Security (RLS) policies
- Automatic timestamps
- Foreign key constraints
- Proper indexing for performance

### Chat Features
- 1:1 and group chats
- Message reactions
- Message read receipts
- Message editing and deletion
- Typing indicators (can be implemented)

### Story Features
- Story creation and viewing
- Story expiration
- Story view tracking
- Story analytics

## 8. Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

## 9. Database Schema Overview

The database includes the following tables:

- `users` - User profiles and authentication
- `chats` - Chat rooms (1:1 or group)
- `chat_members` - Chat membership and permissions
- `messages` - Chat messages with metadata
- `message_reads` - Message read receipts
- `reactions` - Message reactions
- `stories` - User stories with expiration
- `story_views` - Story view tracking

## 10. Security

All tables have Row Level Security (RLS) enabled with appropriate policies:
- Users can only access their own data
- Chat members can only see messages in their chats
- Stories are visible to all users but only creators can manage them
- Proper authentication checks for all operations

## 11. Troubleshooting

### Common Issues

1. **Authentication not working**: Check your Supabase URL and API keys
2. **Real-time not working**: Ensure your Supabase project has real-time enabled
3. **Database errors**: Verify the schema was created correctly
4. **CORS issues**: Check your Supabase project settings

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the console for any error messages
- Verify your database schema matches the expected structure
