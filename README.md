# SCG Assignment – AI Multi-Agent Market Exploration System

## Overview

This project is a prototype AI-powered market exploration platform developed as part of a Full-Stack AI Engineer take-home assignment.

The application allows users to enter a business topic, target region, and target markets, then generates a structured market exploration report through a multi-service AI workflow.

This project is built with:

- Next.js frontend
- NestJS backend
- Python AI service
- Docker Compose for local orchestration

---

## Project Objective

The goal of this project is to demonstrate the ability to build an end-to-end AI application that includes:

- frontend development
- backend API development
- service orchestration
- AI integration
- Docker-based local deployment

This is a working prototype intended to showcase architecture, integration, and full-stack implementation.

---

## What the Application Does

The system allows a user to:

- enter a business topic
- specify a target region
- specify one or more target markets
- submit the request for AI analysis
- receive a structured market exploration result

The analysis is processed through the following flow:

1. the frontend collects user input
2. the backend receives and validates the request
3. the backend orchestrates the analysis flow
4. the backend calls the Python AI service
5. the AI service generates analysis using OpenAI
6. the result is returned to the backend
7. the backend sends the final response to the frontend
8. the frontend displays the result

---

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript

### Backend
- NestJS
- TypeScript

### AI Service
- Python
- FastAPI

### Infrastructure
- Docker
- Docker Compose

---

## Project Structure

```bash
SCG_ASSIGNMENT/
├── frontend/              # Next.js frontend
├── backend/               # NestJS backend
├── ai-agents/             # Python AI service
├── docker-compose.yml     # Multi-service local setup
└── .env                   # Shared root environment variables
```

---

## Services and Ports

| Service | Description | Port |
|--------|-------------|------|
| Frontend | Next.js web application | 3000 |
| Backend | NestJS API service | 3002 |
| AI Agents | Python AI service | 8000 |

---

## Environment Configuration

This project uses a single shared root `.env` file.

Example:

```env
APP_NAME=SCG_ASSIGNMENT
APP_ENV=development

FRONTEND_PORT=3000
PORT=3002
AI_AGENTS_PORT=8000

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002

PYTHON_AI_URL=http://ai-agents:8000

USE_OPENAI=true
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.2
```

### Environment Variable Notes

- `FRONTEND_PORT` = frontend port
- `PORT` = backend port
- `AI_AGENTS_PORT` = AI service port
- `FRONTEND_URL` = frontend URL
- `BACKEND_URL` = backend URL
- `NEXT_PUBLIC_API_URL` = backend URL used by the frontend
- `PYTHON_AI_URL` = internal Docker URL used by backend to call the AI service
- `USE_OPENAI` = toggle for OpenAI usage
- `OPENAI_API_KEY` = OpenAI API key
- `OPENAI_MODEL` = OpenAI model name

---

## Prerequisites

Before running this project, make sure the following tools are installed:

- Git
- Docker
- Docker Compose

You will also need a valid OpenAI API key.

---

## How to Run This Project Locally

After cloning the repository, follow these steps:

### 1. Go to the project folder

```bash
cd SCG_ASSIGNMENT
```

### 2. Create a root `.env` file

Create a file named `.env` in the project root and add the required environment variables.

Example:

```env
APP_NAME=SCG_ASSIGNMENT
APP_ENV=development

FRONTEND_PORT=3000
PORT=3002
AI_AGENTS_PORT=8000

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002

PYTHON_AI_URL=http://ai-agents:8000

USE_OPENAI=true
OPENAI_API_KEY='openai_api_key_here'
OPENAI_MODEL=gpt-5.2
```
### Replace `openai_api_key_here` with the OpenAI API key provided in the email.

### 3. Build and start all services

```bash
docker compose up --build
```

### 4. Open the application

- Frontend: `http://localhost:3000`

### 5. Stop the project

```bash
docker compose down
```

---

## Running in Background

To run the project in detached mode:

```bash
docker compose up --build -d
```

To stop the containers:

```bash
docker compose down
```

---

## Viewing Logs

### View all logs

```bash
docker compose logs -f
```

### View logs for a specific service

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f ai-agents
```

---

## How to Use the Application

1. Open the frontend in the browser
2. Enter a business topic
3. Enter the target region
4. Enter one or more target markets
5. Click **Analyze**
6. Wait for the system to generate the result
7. Review the returned market exploration report

---

## Example Input

Example input:

- **Topic:** Green cement
- **Region:** Southeast Asia
- **Markets:** Thailand, Vietnam, Indonesia

Expected behavior:

- the frontend sends the request to the backend
- the backend orchestrates the analysis
- the backend calls the AI service
- the AI service generates AI-based output
- the frontend displays the final result

---

## API Overview

### Main Endpoint

**POST** `/market/analyze`

Example request body:

```json
{
  "topic": "Green cement",
  "region": "Southeast Asia",
  "markets": ["Thailand", "Vietnam", "Indonesia"]
}
```

Example response shape:

```json
{
  "summary": "AI-generated market exploration summary",
  "details": {},
  "recommendations": []
}
```

---

## Internal Service Communication

Inside Docker, services communicate using service names.

Examples:

- browser to backend:
  - `http://localhost:3002`

- backend to AI service:
  - `http://ai-agents:8000`

Use `localhost` for browser access and service names for container-to-container communication.

---

## Assumptions

This prototype assumes that:

- a valid OpenAI API key is provided
- Docker is the preferred way to run the project locally
- the project is evaluated as a technical assignment prototype

---

## Limitations

Current limitations may include:

- no authentication or user management
- no persistent database
- limited production-level error handling
- AI output depends on prompt design and model behavior
- the system focuses on prototype workflow rather than production hardening

---

## Future Improvements

Possible future improvements include:

- richer final report formatting
- stronger input validation
- better loading and error states
- result history or persistence
- database integration
- caching and performance optimization
- deeper AI agent specialization
- cloud deployment support

---

## Summary

This project is an AI-powered market exploration prototype that demonstrates how to connect:

- a Next.js frontend
- a NestJS backend
- a Python AI service
- OpenAI integration
- Docker Compose orchestration

into a working full-stack AI application.
