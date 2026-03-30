import { readHookInput } from '../lib/hook-io';

async function main() {
  const result = await readHookInput();
  console.log(JSON.stringify(result ?? null));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
