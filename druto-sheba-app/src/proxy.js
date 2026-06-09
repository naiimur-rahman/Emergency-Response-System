import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static assets, and Next.js internals
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Define protected routes
  const isAdminRoute = pathname.startsWith('/analytics') || pathname.startsWith('/hospitals') || pathname.startsWith('/billing') || pathname.startsWith('/maintenance') || pathname.startsWith('/control') || pathname.startsWith('/logs') || pathname.startsWith('/admin-reviews') || pathname.startsWith('/doctors');
  const isDispatcherRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/fleet') || pathname.startsWith('/requests') || pathname.startsWith('/trips') || pathname.startsWith('/operations') || pathname.startsWith('/dispatcher-reviews');

  if (isAdminRoute || isDispatcherRoute) {
    const sessionCookie = request.cookies.get('staff_session');
    
    if (!sessionCookie) {
      // For RSC (client-side navigation) requests, redirect properly
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
      
      // Role-based access control (RBAC)
      if (isAdminRoute && payload.role !== 'Admin') {
         // Redirect non-admins to their dashboard
         return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // Allow request — pass role info via headers for downstream use
      const response = NextResponse.next();
      response.headers.set('x-user-role', payload.role);
      return response;
    } catch (error) {
      console.error('Middleware JWT verification failed:', error?.message || error);
      // Clear invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('staff_session');
      return response;
    }
  }

  // If user tries to access /login or /register while already logged in
  if (pathname === '/login' || pathname === '/register') {
    const sessionCookie = request.cookies.get('staff_session');
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
        if (payload.role === 'Admin') {
          return NextResponse.redirect(new URL('/analytics', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (e) {
         // Invalid cookie, just proceed to login page
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Admin routes
    '/analytics/:path*', 
    '/hospitals/:path*', 
    '/billing/:path*', 
    '/maintenance/:path*',
    '/control/:path*',
    '/logs/:path*',
    '/admin-reviews/:path*',
    '/doctors/:path*',
    // Dispatcher routes
    '/dashboard/:path*', 
    '/fleet/:path*', 
    '/requests/:path*', 
    '/trips/:path*',
    '/operations/:path*',
    '/dispatcher-reviews/:path*',
    // Auth routes
    '/login',
    '/register'
  ],
};
