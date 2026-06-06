import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Define protected routes
  const isAdminRoute = pathname.startsWith('/analytics') || pathname.startsWith('/hospitals') || pathname.startsWith('/billing') || pathname.startsWith('/maintenance');
  const isDispatcherRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/fleet') || pathname.startsWith('/requests') || pathname.startsWith('/trips');

  if (isAdminRoute || isDispatcherRoute) {
    const sessionCookie = request.cookies.get('staff_session');
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
      
      // Role-based access control (RBAC)
      if (isAdminRoute && payload.role !== 'Admin') {
         // Redirect non-admins to their dashboard
         return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // Allow request
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware JWT verification failed:', error);
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
    '/analytics/:path*', 
    '/hospitals/:path*', 
    '/billing/:path*', 
    '/maintenance/:path*',
    '/dashboard/:path*', 
    '/fleet/:path*', 
    '/requests/:path*', 
    '/trips/:path*',
    '/login',
    '/register'
  ],
};
