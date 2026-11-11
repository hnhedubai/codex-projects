function firstRow(result) {
  if (!result.rows[0]) {
    throw new Error("Tracker database function returned no row");
  }
  return result.rows[0];
}

function projectFromRow(row) {
  const project = {
    id: row.id,
    name: row.name,
    countryIso2: row.country_iso2,
    status: row.status,
  };
  if (typeof row.research_brief === "string" && row.research_brief.trim()) {
    project.researchBrief = row.research_brief;
  }
  return project;
}

function isMissingProjectBriefSupport(error) {
  return error?.code === "42883"
    || error?.code === "42P01"
    || /list_research_project_briefs|research_project_briefs|research_brief/i.test(String(error?.message || ""));
}

function mergeProjectBriefs(projects, rows) {
  const briefs = new Map(rows.map(row => [String(row.research_project_id), row.research_brief || ""]));
  return projects.map(project => {
    const brief = briefs.get(String(project.id));
    return brief ? { ...project, researchBrief: brief } : project;
  });
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

function intentFromRow(row) {
  const criteria = row.criteria && typeof row.criteria === "object"
    ? row.criteria
    : JSON.parse(row.criteria || "{}");
  return {
    id: row.id,
    researchProjectId: row.research_project_id,
    goal: row.goal,
    opportunityKind: row.opportunity_kind,
    geography: row.geography,
    sector: row.sector,
    criteria,
    exclusions: row.exclusions,
    priority: row.priority,
    status: row.status,
  };
}

function accountFromRow(row) {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    legalName: row.legal_name,
    displayName: row.display_name,
    companyStatus: row.company_status,
    legalForm: row.legal_form,
    countryOfRegistration: row.country_of_registration,
    websiteUrl: row.website_url,
    primaryDomain: row.primary_domain,
    linkedinUrl: row.linkedin_url,
    description: row.description,
    firecrawlMarkdown: row.firecrawl_markdown,
    firecrawlMarkdownAt: row.firecrawl_markdown_at,
    firecrawlMarkdownHash: row.firecrawl_markdown_hash,
    firecrawlSourceUrl: row.firecrawl_source_url,
    identityConfidence: row.identity_confidence === null || row.identity_confidence === undefined ? null : Number(row.identity_confidence),
    verificationStatus: row.verification_status,
    companyType: row.company_type,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    roles: Array.isArray(row.roles) ? row.roles : [],
  };
}

function roleFromRow(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    roleType: row.role_type,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    roleStatus: row.role_status,
    confidence: row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
    sourceUrl: row.source_url,
    evidenceExcerpt: row.evidence_excerpt,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPostgresTrackerStore({ query }) {
  return {
    async workspaceSummary() {
      const result = await query(
        "select project_count, active_oman_project_count, parcel_count, discovery_run_count, completed_discovery_run_count, contact_count, refreshed_at from tracker_read.v_workspace_rollups where rollup_key = 'global'",
      );
      const row = result.rows[0] || {};
      return {
        projectCount: Number(row.project_count || 0),
        activeOmanProjectCount: Number(row.active_oman_project_count || 0),
        parcelCount: Number(row.parcel_count || 0),
        discoveryRunCount: Number(row.discovery_run_count || 0),
        completedDiscoveryRunCount: Number(row.completed_discovery_run_count || 0),
        contactCount: Number(row.contact_count || 0),
        refreshedAt: row.refreshed_at || null,
      };
    },

    async listProjects({ limit = 200, offset = 0, includeBrief = false } = {}) {
      const result = await query(
        "select id, name, country_iso2, status from tracker_read.list_research_projects($1, $2)",
        [limit, offset],
      );
      const projects = result.rows.map(projectFromRow);
      if (!includeBrief || !projects.length) return projects;
      try {
        const briefs = await query(
          "select research_project_id, research_brief, updated_at from tracker_read.list_research_project_briefs($1::uuid[])",
          [projects.map(project => project.id)],
        );
        return mergeProjectBriefs(projects, briefs.rows);
      } catch (error) {
        if (isMissingProjectBriefSupport(error)) return projects;
        throw error;
      }
    },

    async listAccounts({ limit = 25, offset = 0, search = null, sortKey = null, sortDirection = 'asc' } = {}) {
      const result = await query(
        "select * from tracker_read.list_cprofiles($1, $2, $3, $4, $5)",
        [limit, offset, search || null, sortKey || null, sortDirection === 'desc' ? 'desc' : 'asc'],
      );
      const accounts = result.rows.map(accountFromRow);
      if (!accounts.length) return accounts;

      const roleResult = await query(
        "select id, company_id, role_type, scope_type, scope_id, role_status, confidence, source_url, evidence_excerpt, valid_from, valid_to, first_seen_at, last_seen_at, created_at, updated_at from tracker_read.v_cprofile_roles where company_id = any($1::uuid[]) order by company_id, role_type, scope_type, id",
        [accounts.map(account => account.id)],
      );
      const rolesByCompany = new Map();
      for (const row of roleResult.rows) {
        const companyId = String(row.company_id);
        const roles = rolesByCompany.get(companyId) || [];
        roles.push(roleFromRow(row));
        rolesByCompany.set(companyId, roles);
      }
      return accounts.map(account => ({
        ...account,
        roles: rolesByCompany.get(String(account.id)) || [],
      }));
    },

    async createProject({ name, countryIso2, researchBrief }) {
      const normalizedBrief = typeof researchBrief === "string" ? researchBrief.trim() : "";
      if (normalizedBrief) {
        const result = await query(
          "select * from tracker.create_research_project_with_brief($1, $2, $3)",
          [name, countryIso2, normalizedBrief],
        );
        return { ...projectFromRow(firstRow(result)), researchBrief: normalizedBrief };
      }
      const result = await query(
        "select * from tracker.create_research_project($1, $2)",
        [name, countryIso2],
      );
      return projectFromRow(firstRow(result));
    },

    async updateProject({ id, name, countryIso2, researchBrief, actorId }) {
      const normalizedBrief = typeof researchBrief === "string" ? researchBrief.trim() : "";
      if (normalizedBrief) {
        const result = await query(
          "select * from tracker.update_research_project_with_brief($1, $2, $3, $4, $5)",
          [id, name, countryIso2, normalizedBrief, actorId],
        );
        return { ...projectFromRow(firstRow(result)), researchBrief: normalizedBrief };
      }
      const result = await query(
        "select * from tracker.update_research_project($1, $2, $3, $4)",
        [id, name, countryIso2, actorId],
      );
      return projectFromRow(firstRow(result));
    },

    async deleteProject({ id, actorId }) {
      const result = await query(
        "select * from tracker.delete_research_project($1, $2)",
        [id, actorId],
      );
      return firstRow(result);
    },

    async listParcels({ limit = 200, offset = 0, researchProjectId = null } = {}) {
      const result = await query(
        "select id, research_project_id, name, target_it_load_mw, lifecycle_stage from tracker_read.list_parcels($1, $2, $3)",
        [limit, offset, researchProjectId],
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

    async listIntents(researchProjectId, actorId, { limit = 100, offset = 0 } = {}) {
      const result = await query(
        "select id, research_project_id, goal, opportunity_kind, geography, sector, criteria, exclusions, priority, status from tracker_read.list_intent_requests($1, $2, $3, $4)",
        [researchProjectId, actorId, limit, offset],
      );
      return result.rows.map(intentFromRow);
    },

    async createIntent({
      researchProjectId,
      actorId,
      goal,
      opportunityKind,
      geography,
      sector,
      criteria,
      exclusions,
      priority,
    }) {
      const result = await query(
        "select * from tracker.create_intent_request($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          researchProjectId,
          actorId,
          goal,
          opportunityKind,
          geography,
          sector ?? null,
          JSON.stringify(criteria ?? {}),
          exclusions ?? null,
          priority ?? "normal",
        ],
      );
      return intentFromRow(firstRow(result));
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
