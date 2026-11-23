import argon2 from 'argon2';

async function main(): Promise<void> {
  const password = process.argv.slice(2).join(' ');
  if (!password) {
    console.error('Usage: npm run password-hash -- "strong-password"');
    process.exitCode = 1;
    return;
  }

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 3,
    parallelism: 1,
  });
  console.log(hash);
}

void main().catch((error: unknown) => {
  console.error('Failed to generate password hash:', error);
  process.exitCode = 1;
});
