import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // supabaseResponse must be returned (not a plain NextResponse.next()) so
  // that refreshed session cookies are written back to the browser.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session and writes updated tokens to response cookies.
  // Do not remove — without this, tokens silently expire.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirect = NextResponse.redirect(url)
    // Copy refreshed session cookies to the redirect so they aren't lost
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirect.cookies.set({ name, value, ...options })
    })
    return redirect
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirect.cookies.set({ name, value, ...options })
    })
    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except static assets, images, and favicon
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}