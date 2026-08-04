/**
 * Runs the reminder sweep once, directly against the database. Handy for
 * local testing: `npm run reminders:run`.
 */
import { runReminderSweep } from "../src/lib/booking/reminders";
import { db } from "../src/lib/db";

async function main() {
  const result = await runReminderSweep();
  console.log(
    `✅ Reminder sweep complete — checked ${result.checked}, sent ${result.sent}, failed ${result.failed}.`
  );
  if (result.errors.length > 0) {
    console.log("Errors:", result.errors);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
