// Add demo users to Neon Auth via the Better Auth sign-up API
// Run: node scripts/add-users.js

const AUTH_URL =
  "https://ep-plain-darkness-ao06zq83.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth";

// Neon Auth (Better Auth) requires passwords ≥ 8 characters.
const USERS = [
  { name: "pop", email: "pop@nmt.local", password: "pop_1234" },
  { name: "pok", email: "pok@nmt.local", password: "pok_1234" },
];

async function signUp(user) {
  const res = await fetch(`${AUTH_URL}/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:8081",
    },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      callbackURL: "http://localhost:8081/",
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (res.ok) {
    console.log(`✅ Created user: ${user.name} (${user.email})`);
  } else {
    // If user already exists, treat as success
    const msg = body?.message ?? JSON.stringify(body);
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist")) {
      console.log(`⚠️  User already exists: ${user.name} (${user.email})`);
    } else {
      console.error(`❌ Failed to create ${user.name}: ${msg}`);
    }
  }
}

console.log("Adding demo users to Neon Auth...\n");
for (const user of USERS) {
  await signUp(user);
}
console.log("\nDone.");
