// Test login against Neon Auth
const AUTH_URL =
  "https://ep-plain-darkness-ao06zq83.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth";

async function testLogin(email, password) {
  console.log(`\nTesting sign-in: ${email}`);
  const res = await fetch(`${AUTH_URL}/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:8080",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`Status: ${res.status}`);
  console.log(`Response:`, JSON.stringify(body, null, 2));
}

await testLogin("pop@nmt.local", "pop_1234");
await testLogin("pop@nakhonsawan.local", "pop_1234");
