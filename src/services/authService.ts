import { supabase } from './supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { 
  saveCachedAuthSession, 
  getCachedAuthSessionSync, 
  clearCachedAuthSession, 
  CachedAuthSession 
} from './indexedDbService';
import { setLastActiveUserId, getLastActiveUserId } from './storageService';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Reconstruct a Supabase User object from local cached session
 */
export function reconstructUserFromCachedSession(cached: CachedAuthSession): User {
  return {
    id: cached.userId,
    app_metadata: {},
    user_metadata: cached.userMetadata || { full_name: cached.fullName || '' },
    aud: 'authenticated',
    created_at: cached.lastAuthenticatedAt,
    email: cached.email || '',
    phone: '',
    role: 'authenticated',
    updated_at: cached.lastAuthenticatedAt
  } as User;
}

/**
 * Get cached user synchronously on frame-0 with zero network latency
 */
export function getOfflineCachedUser(): User | null {
  const cached = getCachedAuthSessionSync();
  if (cached && cached.userId) {
    return reconstructUserFromCachedSession(cached);
  }
  return null;
}

/**
 * Cache user session helper
 */
export function persistLocalUserSession(user: User, session?: Session | null) {
  if (!user || !user.id) return;
  setLastActiveUserId(user.id);
  const cached: CachedAuthSession = {
    userId: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || '',
    userMetadata: user.user_metadata,
    lastAuthenticatedAt: new Date().toISOString(),
    accessToken: session?.access_token,
    refreshToken: session?.refresh_token
  };
  saveCachedAuthSession(cached);
}

/**
 * Sign up with Email and Password (Instant registration without email verification)
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || '',
        },
      },
    });

    if (error) return { user: null, session: null, error };

    // If session is already available, persist locally and return directly
    if (data.session && data.user) {
      persistLocalUserSession(data.user, data.session);
      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    }

    // Immediate sign-in if auto-confirm is enabled
    const signInRes = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInRes.error) {
      if (data.user) {
        persistLocalUserSession(data.user);
      }
      return { user: data.user, session: null, error: null };
    }

    if (signInRes.data.user) {
      persistLocalUserSession(signInRes.data.user, signInRes.data.session);
    }

    return {
      user: signInRes.data.user,
      session: signInRes.data.session,
      error: null,
    };
  } catch (err: any) {
    return {
      user: null,
      session: null,
      error: err,
    };
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) return { user: null, session: null, error };

    if (data.user) {
      persistLocalUserSession(data.user, data.session);
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err: any) {
    return {
      user: null,
      session: null,
      error: err,
    };
  }
}

/**
 * Sign out current authenticated user (Explicit action only)
 */
export async function signOutUser(): Promise<{ error: AuthError | null }> {
  try {
    setLastActiveUserId(undefined);
    await clearCachedAuthSession();
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Trigger Password Reset Email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Trigger OAuth Sign-in (Google)
 */
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Get current session (reads immediately from local storage cache)
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Get current user with TRUE offline persistence
 * 
 * Guarantees:
 * - If user was logged in, returns cached user instantly even when offline or during network outages.
 * - Internet loss NEVER triggers an unauthenticated/logout state.
 * - Silently refreshes Supabase session in the background when network is active.
 */
export async function getCurrentUser(): Promise<User | null> {
  // 1. Instant local cached user (0ms latency, works 100% offline)
  const localCachedUser = getOfflineCachedUser();
  if (localCachedUser) {
    // Silently attempt background session refresh without blocking UI or throwing if offline
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        persistLocalUserSession(data.session.user, data.session);
      }
    }).catch(() => {
      // Offline / network failure -> Keep user authenticated locally
    });

    return localCachedUser;
  }

  // 2. Check Supabase disk session
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      persistLocalUserSession(sessionData.session.user, sessionData.session);
      return sessionData.session.user;
    }
  } catch {
    // Ignore
  }

  // 3. Check if last active user exists in storage
  const lastActiveId = getLastActiveUserId();
  if (lastActiveId && lastActiveId !== 'guest') {
    const syntheticUser: User = {
      id: lastActiveId,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: '',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString()
    } as User;
    return syntheticUser;
  }

  return null;
}

/**
 * Subscribe to auth state changes and keep offline cache updated
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      if (session?.user) {
        persistLocalUserSession(session.user, session);
      }
    } else if (event === 'SIGNED_OUT') {
      clearCachedAuthSession();
      setLastActiveUserId(undefined);
    }
    callback(event, session);
  });
}
