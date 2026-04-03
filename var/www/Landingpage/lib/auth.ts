import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Demo authentication - replace with real database
        if (credentials?.email === "admin@paymydine.com" && credentials?.password === "admin123") {
          return {
            id: "1",
            email: "admin@paymydine.com",
            name: "Admin User",
            role: "admin",
          }
        }

        // Demo customer login
        if (credentials?.email === "customer@example.com" && credentials?.password === "customer123") {
          return {
            id: "2",
            email: "customer@example.com",
            name: "John Doe",
            role: "customer",
          }
        }

        // Allow any email/password for demo
        if (credentials?.email && credentials?.password) {
          return {
            id: Date.now().toString(),
            email: credentials.email as string,
            name: (credentials.email as string).split("@")[0],
            role: "customer",
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role
        ;(session.user as any).id = token.id || token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "paymydine-secret-key-change-in-production",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})
