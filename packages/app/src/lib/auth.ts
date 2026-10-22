import { env } from "cloudflare:workers"
import { schema } from "@solstatus/common/db/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP } from "better-auth/plugins"
import { drizzle } from "drizzle-orm/d1"
import { secondaryStorage } from "@/db/secondaryStorage"

const authSchema = {
  ...schema,
  account: schema.AccountTable,
  session: schema.SessionTable,
  user: schema.UserTable,
  verification: schema.VerificationTable,
}

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(env.DB), {
    provider: "sqlite",
    schema: authSchema,
  }),

  secondaryStorage,
  secret: env.BETTER_AUTH_SECRET,

  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }, _request) => {
        // send email to user with OTP
        console.log({ email, otp, type })
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
  ],
})
