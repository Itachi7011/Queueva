# Running Queueva with Docker

This lets you run the whole app (plus a database) on your own computer,
without installing Node.js or Postgres directly. You only need
[Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

## Step 1: create your .env file

```bash
cp .env.example .env
```

Open `.env` and fill in at least these two (generate them with
`openssl rand -base64 48`, run twice for two different values):

```
JWT_ACCESS_SECRET=paste-a-long-random-string-here
JWT_REFRESH_SECRET=paste-a-different-long-random-string-here
```

You can leave `DATABASE_URL` as-is in `.env` — `compose.yaml` overrides it
automatically to point at the Docker database. Everything else
(SendGrid, Cloudinary, Stripe) can stay blank, same as normal development.

## Step 2: build and start everything

```bash
docker compose up --build
```

This does three things:
- downloads a small Postgres database and starts it
- builds our app into an image, using the `Dockerfile`
- starts the app and connects it to the database

The first build takes a few minutes. After that, it's much faster.

Leave this running in its own terminal window. When you want to stop it,
press `Ctrl+C`, or open a new terminal and run:

```bash
docker compose down
```

## Step 3: create the database tables (one time only)

The app needs its database tables created before it will work. With the
containers running (from Step 2), open a **new terminal window** in the
project folder and run this on your own computer (not inside Docker):

```bash
DATABASE_URL="postgresql://queueva:queueva@localhost:5432/queueva" npx prisma db push
```

This works because `compose.yaml` also opens up the database on
`localhost:5432` for you, so your own computer can reach it directly.

You only need to do this once, unless you change the database schema in
`prisma/schema.prisma` later, or reset the database.

## Step 4: open the app

Go to [http://localhost:3000](http://localhost:3000) in your browser.

## (Optional) add some demo data

```bash
DATABASE_URL="postgresql://queueva:queueva@localhost:5432/queueva" npm run db:seed
```

## (Optional) create your admin login

```bash
DATABASE_URL="postgresql://queueva:queueva@localhost:5432/queueva" SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=StrongPass1 npm run bootstrap:admin
```

## Starting fresh (deletes all data!)

```bash
docker compose down -v
```

The `-v` also deletes the saved database data, so you'll need to repeat
Step 3 (and the optional steps) afterward.

## Common questions

**"Why do I run `prisma db push` on my own computer instead of inside Docker?"**
Our production Docker image is intentionally kept small and doesn't include
the full set of developer tools (like the Prisma command-line tool) — only
what's needed to run the app. Since you already have Node.js installed to
work on this project, it's simplest to run one-time database setup commands
from your own computer instead.

**"The app container keeps restarting / shows a database error."**
Make sure Step 3 has been run at least once, and that your `.env` has
`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` filled in.
