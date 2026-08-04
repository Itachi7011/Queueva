# Running Queueva on Kubernetes

This folder has everything needed to run the app on a Kubernetes cluster.
This guide assumes you're testing on your own computer using
[minikube](https://minikube.sigs.k8s.io/) or
[kind](https://kind.sigs.k8s.io/) - both are free tools that run a small
Kubernetes cluster on your machine.

## What's in this folder

| File | What it does |
|---|---|
| `postgres-secret.yaml` | Database username/password |
| `postgres-pvc.yaml` | Storage space for the database |
| `postgres-deployment.yaml` | Runs the database container |
| `postgres-service.yaml` | Gives the database a stable internal address |
| `app-configmap.yaml` | The app's non-secret settings |
| `app-secret.yaml` | The app's secret settings (keys, passwords) |
| `app-deployment.yaml` | Runs the app container |
| `app-service.yaml` | Lets you reach the app from your browser |

## Step 1: build the app's image

From the main project folder (not this `k8s` folder):

```bash
docker build -t queueva:latest .
```

## Step 2: make the image available to your cluster

**If you're using minikube:**

```bash
minikube image load queueva:latest
```

**If you're using kind:**

```bash
kind load docker-image queueva:latest
```

## Step 3: check your secrets before applying

Open `app-secret.yaml` and at least change `JWT_ACCESS_SECRET` and
`JWT_REFRESH_SECRET` to your own random values (you can generate one with
`openssl rand -base64 48`). Leave the SendGrid/Cloudinary/Stripe ones blank
if you don't have them yet - the app handles that gracefully.

## Step 4: apply all the files

From the main project folder:

```bash
kubectl apply -f k8s/
```

This creates everything at once: the database, its storage, its secret,
the app, its settings, and its secret.

## Step 5: check that things are running

```bash
kubectl get pods
```

You should see two pods, something like:

```
NAME                            READY   STATUS    RESTARTS   AGE
postgres-xxxxxxxxxx-xxxxx       1/1     Running   0          1m
queueva-app-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
```

If a pod says `CrashLoopBackOff` or `Error` instead of `Running`, see
"If something goes wrong" below.

## Step 6: create the database tables (one time only)

The app needs its database tables created before it will work. First,
let your own computer reach the database inside the cluster:

```bash
kubectl port-forward svc/postgres 5432:5432
```

Leave that running, open a **new terminal window**, and run:

```bash
DATABASE_URL="postgresql://queueva:queueva@localhost:5432/queueva" npx prisma db push
```

Then you can stop the port-forward command (`Ctrl+C`) - you don't need it
running all the time, just for this one-time setup.

## Step 7: open the app

**If you're using minikube:**

```bash
minikube service queueva-app
```

This opens the app in your browser automatically.

**If you're using kind, or minikube doesn't open a browser for you:**

```bash
kubectl port-forward svc/queueva-app 3000:3000
```

Then go to [http://localhost:3000](http://localhost:3000).

## (Optional) add demo data or an admin login

Same as Step 6, run `kubectl port-forward svc/postgres 5432:5432` first,
then in another terminal:

```bash
DATABASE_URL="postgresql://queueva:queueva@localhost:5432/queueva" npm run db:seed

DATABASE_URL="postgresql://queueva:queueva@localhost:5432/queueva" SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=StrongPass1 npm run bootstrap:admin
```

## If something goes wrong

**Check the app's logs:**

```bash
kubectl logs deployment/queueva-app
```

**Check the database's logs:**

```bash
kubectl logs deployment/postgres
```

**A pod says `ImagePullBackOff`:** this means Kubernetes couldn't find the
`queueva:latest` image. Go back to Step 1 and 2 and make sure the image
was built and loaded into your cluster correctly.

**Start over completely (deletes all data!):**

```bash
kubectl delete -f k8s/
```

Then start again from Step 1.
