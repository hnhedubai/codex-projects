function firstRow(result) {
  if (!result.rows[0]) {
    throw new Error("Tracker database function returned no row");
  }
  return result.rows[0];
}

function projectFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    countryIso2: row.country_iso2,
    status: row.status,
  };
}

function parcelFromRow(row) {
  return {
    id: row.id,
    researchProjectId: row.research_project_id,
    name: row.name,
    targetItLoadMw: Number(row.target_it_load_mw),
    lifecycleStage: row.lifecycle_stage,
  };
}

export function createPostgresTrackerStore({ query }) {
  return {
    async listProjects() {
      const result = await query(
        "select id, name, country_iso2, status from tracker_read.v_research_projects order by created_at desc",
      );
      return result.rows.map(projectFromRow);
    },

    async createProject({ name, countryIso2 }) {
      const result = await query(
        "select * from tracker.create_research_project($1, $2)",
        [name, countryIso2],
      );
      return projectFromRow(firstRow(result));
    },

    async listParcels() {
      const result = await query(
        "select id, research_project_id, name, target_it_load_mw, lifecycle_stage from tracker_read.v_parcels order by created_at desc",
      );
      return result.rows.map(parcelFromRow);
    },

    async createParcel({ researchProjectId, name, targetItLoadMw }) {
      const result = await query(
        "select * from tracker.create_parcel($1, $2, $3)",
        [researchProjectId, name, targetItLoadMw],
      );
      return parcelFromRow(firstRow(result));
    },

    async recordJevVote({
      subjectType,
      subjectId,
      checkpoint,
      outcome,
      confidence,
      reason,
    }) {
      const result = await query(
        "select * from tracker.record_jev_vote($1, $2, $3, $4, $5, $6)",
        [subjectType, subjectId, checkpoint, outcome, confidence, reason],
      );
      const row = firstRow(result);
      return {
        id: row.id,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        checkpoint: row.checkpoint,
        outcome: row.outcome,
        confidence: row.confidence === null ? null : Number(row.confidence),
        reason: row.reason,
      };
    },
  };
}
