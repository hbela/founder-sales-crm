A focused founder-sales CRM is a good fit for your stack and goals. The key is to build something that helps you sell Sunshine Dental today, while remaining generic enough to support future products.

# PRD: Founder Sales CRM

## Vision

A lightweight sales CRM and outreach platform designed for solo founders and small software agencies to manage prospects, run outreach campaigns, track conversations, and convert leads into customers.

The system should help sell products such as:

* Sunshine Dental
* Standalone Finance Manager
* Standalone Task Manager
* Future SaaS products

The product prioritizes simplicity over enterprise features.

---

# Goals

## Business Goals

* Convert outreach campaigns into demo calls.
* Manage multiple products from one platform.
* Maintain a single source of truth for prospects.
* Reduce missed follow-ups.
* Provide visibility into the sales pipeline.

## User Goals

* Know who to contact next.
* Know which contacts replied.
* Track every interaction.
* Send personalized outreach emails.
* Schedule follow-ups.

---

# Target Users

## Primary User

Solo founder

Characteristics:

* Sells multiple products
* Handles all sales personally
* Limited budget
* Needs a simple workflow

## Secondary User

Small software agency

Characteristics:

* 1–10 team members
* Multiple clients
* Outbound prospecting

---

# MVP Scope

## Contact Management

### Create Contact

Fields:

* First Name
* Last Name
* Company
* Email
* Phone
* Website
* Industry
* Country
* Notes

### Contact Status

* NEW
* CONTACTED
* REPLIED
* INTERESTED
* MEETING_BOOKED
* CUSTOMER
* LOST

### Contact Search

Search by:

* Name
* Company
* Email
* Product
* Status

---

## Product Management

A product represents something being sold.

Fields:

* Name
* Slug
* Description
* Website

Examples:

* Sunshine Dental
* Finance Manager
* Task Manager

---

## Campaign Management

Fields:

* Name
* Product
* Target Market
* Start Date
* End Date
* Status

Status:

* DRAFT
* ACTIVE
* PAUSED
* COMPLETED

Examples:

* Hungarian Dental Clinics June 2026
* Financial Advisors July 2026

---

## Email Templates

Reusable templates.

Fields:

* Name
* Subject
* Body

Supported Variables:

* {{firstName}}
* {{lastName}}
* {{company}}
* {{website}}
* {{productName}}

Preview before sending.

---

## Outreach Queue

Purpose:

Prevent accidental mass email sending.

Fields:

* Contact
* Campaign
* Template
* Scheduled At
* Sent At
* Status

Status:

* PENDING
* SENDING
* SENT
* FAILED

---

## Follow-Up Management

Automatic reminders.

Examples:

* Follow up after 3 days
* Follow up after 7 days
* Follow up after 14 days

Dashboard Widget:

"Contacts requiring follow-up"

---

## Activity Timeline

Every action is recorded.

Examples:

* Contact created
* Email sent
* Reply received
* Meeting booked
* Status changed

Timeline should appear on the contact details page.

---

## Sales Pipeline

Stages:

* New
* Contacted
* Replied
* Interested
* Demo Scheduled
* Customer
* Lost

Kanban-style interface.

---

## Dashboard

Metrics:

* Total Contacts
* Emails Sent
* Replies
* Meetings Booked
* Customers
* Reply Rate
* Conversion Rate

Widgets:

* Follow-ups Due Today
* Recent Replies
* Active Campaigns

---

# Integrations

## Email

Phase 1:

* Resend

Capabilities:

* Send emails
* Webhook events
* Delivery tracking

Future:

* Amazon SES
* SMTP

---

## Calendar

Phase 2:

* Big Calendar integration

Capabilities:

* Demo scheduling
* Meeting tracking

---

# Non-Functional Requirements

## Performance

* Contact list under 500ms
* Dashboard under 2 seconds

## Security

* Authentication required
* Role-based permissions
* Audit logs

## Reliability

* Failed email retries
* Background job processing

---

# Suggested Tech Stack

Frontend

* React 19
* TanStack Router
* TanStack Query
* shadcn

Backend

* Fastify
* TypeScript

Database

* PostgreSQL
* Prisma

Jobs

* node-cron (MVP)

Email

* Resend

Hosting

* Hetzner VPS
* Coolify

---

# Phase 2

* AI-generated outreach
* AI lead research
* Website scraping
* Contact enrichment
* Email open tracking
* Click tracking
* Meeting scheduler
* Team collaboration
* Multi-user accounts

---

# Success Criteria

Within 90 days:

* 200 prospects imported
* 500+ emails sent
* 20+ replies
* 10+ demo calls
* First paying customer acquired through the platform

This PRD is intentionally lean. A realistic v1 could be built in 2–4 weeks and immediately used to run your Sunshine Dental outreach campaign while serving as the foundation for a future SaaS CRM product.
