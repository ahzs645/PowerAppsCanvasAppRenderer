-- Supabase Database Schema for PowerApps Canvas App Renderer
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (handled by Supabase Auth, but we reference it)
-- No need to create this - Supabase Auth handles users

-- Apps table
CREATE TABLE apps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screens table
CREATE TABLE screens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    yaml TEXT NOT NULL,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User workspaces table (stores active app/screen for each user)
CREATE TABLE user_workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    active_app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    active_screen_id UUID REFERENCES screens(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_apps_user_id ON apps(user_id);
CREATE INDEX idx_screens_app_id ON screens(app_id);
CREATE INDEX idx_user_workspaces_user_id ON user_workspaces(user_id);

-- Triggers to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screens_updated_at
    BEFORE UPDATE ON screens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_workspaces_updated_at
    BEFORE UPDATE ON user_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: Row Level Security (RLS) is disabled since we're using Clerk for authentication
-- Security is handled at the application level by filtering queries with the user_id from Clerk
-- The database service functions in the app ensure users only access their own data
