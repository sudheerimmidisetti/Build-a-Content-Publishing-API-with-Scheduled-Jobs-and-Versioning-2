# Build a Content Publishing API with Scheduled Jobs and Versioning

A fully containerized, production-ready Content Management System (CMS)
backend built using:

-   Node.js (Express)
-   PostgreSQL
-   Redis
-   BullMQ (Background Jobs)
-   Docker & Docker Compose
-   JWT Authentication
-   Full-Text Search (PostgreSQL GIN + tsvector)

------------------------------------------------------------------------

## Project Overview

This CMS backend supports a complete content lifecycle:

-   Draft → Scheduled → Published
-   Automatic scheduled publishing (background worker)
-   Content versioning (revision history)
-   JWT-based authentication
-   Role-based access control (Author / Public)
-   Redis caching for performance
-   Full-text search using PostgreSQL
-   Fully Dockerized setup

------------------------------------------------------------------------

## Architecture

-   **API Service** -- Handles authentication, content management, media
    uploads
-   **Worker Service** -- Publishes scheduled posts automatically
-   **PostgreSQL** -- Relational database with indexes and search vector
-   **Redis** -- Caching layer + BullMQ queue backend
-   **Docker Compose** -- Orchestrates all services

------------------------------------------------------------------------

## Project Structure

    cms-backend/
    │
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .dockerignore
    ├── .gitignore
    ├── .env
    ├── package.json
    ├── package-lock.json
    │
    ├── docker-entrypoint-initdb.d/
    │   └── schema.sql
    │
    └── src/
        ├── app.js
        ├── server.js
        ├── worker.js
        ├── queue.js
        │
        ├── config/
        │   └── db.js
        │
        ├── middleware/
        │   ├── auth.js
        │   ├── role.js
        │   └── errorHandler.js
        │
        ├── routes/
        │   ├── auth.routes.js
        │   ├── posts.routes.js
        │   ├── public.routes.js
        │   └── media.routes.js
        │
        └── utils/
            └── slugify.js

------------------------------------------------------------------------

## Authentication & Roles

### Roles:

-   `author` -- Can create, update, schedule, publish posts
-   `public` -- Can only read published posts

JWT-based authentication secures protected endpoints.

------------------------------------------------------------------------

## Features Implemented

### Content Lifecycle

-   Create Draft
-   Schedule Post
-   Publish Immediately
-   Automatic publishing via worker

### Content Versioning

Every update stores previous version in `post_revisions` table.

### Full-Text Search

Uses PostgreSQL `tsvector` and `GIN` index for fast search queries.

### Redis Caching

-   Cache-aside strategy
-   Cache invalidation on update
-   Faster read performance

### Background Worker

Runs periodically and: - Detects scheduled posts - Publishes them
transactionally - Ensures idempotency

------------------------------------------------------------------------

## Database Schema

Tables:

-   `users`
-   `posts`
-   `post_revisions`

Indexes: - status - author_id - scheduled_for - published_at -
search_vector (GIN)

------------------------------------------------------------------------

## How To Run

### 1️. Clone Repository

``` bash
git clone https://github.com/sudheerimmidisetti/Build-a-Content-Publishing-API-with-Scheduled-Jobs-and-Versioning
cd Build-a-Content-Publishing-API-with-Scheduled-Jobs-and-Versioning
```

### 2️. Start All Services

``` bash
docker-compose up --build
```

API runs on:

    http://localhost:5000

------------------------------------------------------------------------

## API Endpoints

### Authentication

    POST /auth/login

### Author Routes (Protected)

    POST   /posts
    PUT    /posts/:id
    DELETE /posts/:id
    POST   /posts/:id/publish
    POST   /posts/:id/schedule
    GET    /posts/:id/revisions
    POST   /media/upload

### Public Routes

    GET /posts/published
    GET /posts/published/:id
    GET /search?q=keyword

------------------------------------------------------------------------

## Testing Checklist

-   JWT authentication working
-   Role-based access enforced
-   Slug uniqueness handled
-   Revision history stored
-   Scheduled publishing auto-executes
-   Redis caching verified
-   Search under 500ms
-   Docker fully functional

------------------------------------------------------------------------

## Performance & Reliability

-   Transactions used for multi-table operations
-   Idempotent background worker
-   Indexed database queries
-   Stateless API design
-   Secure parameterized SQL queries

------------------------------------------------------------------------
