-- Existing current-version admin approvals were previously stored as evidence first
-- and required a second manual lifecycle click. Under the simplified policy,
-- an Admin Onayı is itself the approval decision, so promote any still-waiting
-- managed template that already has current-version admin approval evidence.
UPDATE ContractTemplate AS template
JOIN ContractTemplateReviewEvidence AS evidence
  ON evidence.templateId = template.id
 AND evidence.templateVersion = template.version
 AND evidence.evidenceType = 'admin_approval'
SET template.lifecycleStatus = 'approved',
    template.active = false,
    template.approvedById = COALESCE(template.approvedById, evidence.recordedById),
    template.approvedAt = COALESCE(template.approvedAt, evidence.createdAt),
    template.activatedAt = NULL,
    template.updatedById = COALESCE(evidence.recordedById, template.updatedById),
    template.updatedAt = GREATEST(template.updatedAt, evidence.createdAt)
WHERE template.lifecycleStatus = 'review'
  AND template.code NOT LIKE 'SOFT\_%';
