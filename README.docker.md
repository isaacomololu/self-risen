# Docker Setup Guide

This project is dockerized and can be run using Docker Compose.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Environment variables configured (see `.env.example`)

## Quick Start

### Production Mode

1. Create a `.env` file in the root directory with your environment variables (see `.env.example` for reference)

2. Build and start all services:

```bash
docker-compose up -d
```

3. View logs:

```bash
docker-compose logs -f app
```

4. Stop all services:

```bash
docker-compose down
```

### Development Mode

For development, you can run only the database and Redis services using Docker, while running the NestJS app locally:

1. Start only PostgreSQL and Redis:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. Run the application locally:

```bash
pnpm install
pnpm run start:dev
```

3. Stop services:

```bash
docker-compose -f docker-compose.dev.yml down
```

## Services

- **app**: NestJS application (port 8080)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis server for Bull queues (port 6379)

## Database Migrations

Migrations are automatically run when the app container starts. If you need to run migrations manually:

```bash
docker-compose exec app npx prisma migrate deploy
```

Or for development:

```bash
docker-compose exec app npx prisma migrate dev
```

## Prisma Studio

To access Prisma Studio:

```bash
docker-compose exec app npx prisma studio
```

Then open http://localhost:5555 in your browser.

## Environment Variables

Required environment variables are defined in `docker-compose.yml`. Make sure to set them in your `.env` file or pass them directly to docker-compose.

## Volumes

- `postgres_data`: Persistent storage for PostgreSQL data
- `redis_data`: Persistent storage for Redis data

## Building the Image

To build the Docker image manually:

```bash
docker build -t self-risen:latest .
```

## Troubleshooting

### Database Connection Issues

If the app can't connect to the database, ensure:

1. The `postgres` service is healthy: `docker-compose ps`
2. The `DATABASE_URL` in your environment matches the service name: `postgresql://postgres:postgres@postgres:5432/self_risen`

### Redis Connection Issues

Ensure the `REDIS_HOST` is set to `redis` (the service name) when running in Docker.

### Firebase Credentials

Make sure `firebase-credentials.json` exists in the project root. It will be mounted into the container.

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Resetting Everything

To completely reset and start fresh:

```bash
docker-compose down -v
docker-compose up -d
```

This will remove all volumes and recreate everything.
