# ADR 0001: Controlled database access for tracker writes and reads

## Status

Accepted — 4 October 2026.

## Context

The tracker holds relationship intelligence, public contact details, Reoon
verification outcomes, land-screening evidence, and allocation progress. The
user requires every operational output to be retained in Lakebase Postgres,
with data manipulation through controlled database routines and retrieval
through views.

## Decision

The application will call versioned Postgres functions for every create,
update, transition, and rejection action. It will query named views for list
and dashboard retrieval. Browser code never receives a database connection;
it calls an authenticated HTTP handler only.

Each function owns validation that belongs close to the data, records audit
fields, and returns the corresponding view-shaped record. Migrations create
the routines and views together.

## Consequences

This adds SQL migration discipline and requires each workflow addition to
include a function plus a view. In exchange, it centralises access controls,
lets the same model serve the GUI and future automation, and prevents direct
table writes from being scattered across application code.

## Alternatives considered

- Direct table writes from the browser: rejected because it exposes database
  concerns to the client and weakens workflow control.
- Direct table writes from an HTTP handler: rejected because validation and
  audit behaviour would be duplicated as workflows expand.
- An ORM-only write model: rejected because it would not meet the explicit
  stored-routine requirement.
