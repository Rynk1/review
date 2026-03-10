/**
 * Matching Algorithm for Reviewer-Proposal pairing.
 * 
 * Final Score Formula:
 * final_score = relevance_score × (1 - conflict_score) × (1 - bias_penalty) × availability_factor
 */

/**
 * Calculate relevance score between a proposal and a reviewer.
 * Uses keyword matching against expertise, areas, and publications.
 * 
 * @param {Object} proposal - Proposal with title, abstract, keywords
 * @param {Object} reviewer - Reviewer profile with expertise, areas, publications
 * @returns {number} Score between 0.0 and 1.0
 */
export function calculateRelevanceScore(proposal, reviewer) {
  const proposalText = [
    proposal.title || '',
    proposal.abstract || '',
    ...(proposal.keywords || []),
  ].join(' ').toLowerCase();

  const proposalWords = proposalText.split(/\s+/).filter(w => w.length > 3);

  if (proposalWords.length === 0) return 0;

  // Build reviewer word set from expertise, areas, and publication titles
  const reviewerWords = new Set();

  (reviewer.expertise || []).forEach(e => {
    e.toLowerCase().split(/\s+/).forEach(w => reviewerWords.add(w));
  });

  const areas = reviewer.areas || {};
  Object.values(areas).forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        item.toLowerCase().split(/\s+/).forEach(w => reviewerWords.add(w));
      });
    }
  });

  (reviewer.publications || []).forEach(pub => {
    if (pub.title) {
      pub.title.toLowerCase().split(/\s+/).forEach(w => reviewerWords.add(w));
    }
  });

  // Count matching words (with partial matching)
  let matches = 0;
  const reviewerWordsArray = Array.from(reviewerWords);

  proposalWords.forEach(word => {
    if (reviewerWords.has(word) || reviewerWordsArray.some(rw =>
      rw.includes(word) || word.includes(rw)
    )) {
      matches++;
    }
  });

  return Math.min(matches / proposalWords.length, 1.0);
}

/**
 * Calculate conflict score between a proposal and a reviewer.
 * Higher score = more conflict.
 * 
 * @param {Object} proposal - Proposal with applicant_user_id, tenant_id, collaborators
 * @param {Object} reviewer - Reviewer with user_id, email, orcid, tenant_id, publications
 * @returns {number} Score between 0.0 and 1.0
 */
export function calculateConflictScore(proposal, reviewer) {
  let maxConflict = 0;

  // Self conflict - reviewer is the applicant
  if (proposal.applicant_user_id === reviewer.user_id) {
    return 1.0;
  }

  const collaborators = proposal.collaborators || [];

  // Direct collaborator conflict
  if (collaborators.length > 0) {
    for (const collab of collaborators) {
      if (
        (collab.email && collab.email === reviewer.email) ||
        (collab.orcid && collab.orcid === reviewer.orcid)
      ) {
        return 1.0;
      }
    }
  }

  // Recent coauthorship check (within last 3 years)
  const recentYearThreshold = new Date().getFullYear() - 3;
  const publications = reviewer.publications || [];

  for (const pub of publications) {
    if (pub.year >= recentYearThreshold && pub.authors && collaborators.length > 0) {
      for (const collab of collaborators) {
        if (collab.name && pub.authors.some(author =>
          author.toLowerCase().includes(collab.name.toLowerCase()) ||
          collab.name.toLowerCase().includes(author.toLowerCase())
        )) {
          maxConflict = Math.max(maxConflict, 0.8);
        }
      }
    }
  }

  // Same institution (same tenant)
  if (proposal.tenant_id === reviewer.tenant_id) {
    maxConflict = Math.max(maxConflict, 0.3);
  }

  return maxConflict;
}

/**
 * Calculate availability factor based on current workload.
 * 
 * @param {number} currentAssignments - Current number of active assignments
 * @param {number} workloadLimit - Maximum allowed assignments
 * @returns {number} Factor between 0.0 and 1.0
 */
export function calculateAvailabilityFactor(currentAssignments, workloadLimit) {
  if (workloadLimit <= 0) return 0;
  if (currentAssignments >= workloadLimit) return 0;

  return Math.max(0.1, (workloadLimit - currentAssignments) / workloadLimit);
}

/**
 * Compute the final composite score for a reviewer-proposal pair.
 * 
 * @param {number} relevanceScore
 * @param {number} conflictScore
 * @param {number} biasPenalty
 * @param {number} availabilityFactor
 * @returns {number} Final score between 0.0 and 1.0
 */
export function computeFinalScore(relevanceScore, conflictScore, biasPenalty, availabilityFactor) {
  return relevanceScore * (1 - conflictScore) * (1 - biasPenalty) * availabilityFactor;
}

/**
 * Generate conflict flags for high-conflict reviewer-proposal pairs.
 * 
 * @param {Object} proposal
 * @param {Object} reviewer
 * @param {number} conflictScore
 * @returns {Object|null} Conflict flag data or null if no significant conflict
 */
export function generateConflictFlag(proposal, reviewer, conflictScore) {
  if (conflictScore < 0.3) return null;

  let conflictType = 'other';
  let reason = '';
  const evidence = {};

  if (conflictScore >= 1.0) {
    if (proposal.applicant_user_id === reviewer.user_id) {
      conflictType = 'collaboration';
      reason = 'Reviewer is the proposal applicant';
    } else {
      conflictType = 'collaboration';
      reason = 'Reviewer is a direct collaborator on this proposal';
      evidence.direct_collaborator = true;
    }
  } else if (conflictScore >= 0.8) {
    conflictType = 'coauthorship';
    reason = 'Reviewer has recent coauthorship with a collaborator';
    evidence.recent_coauthorship = true;
  } else if (conflictScore >= 0.3) {
    conflictType = 'institution';
    reason = 'Reviewer is from the same institution as the applicant';
    evidence.same_institution = true;
  }

  return {
    conflict_type: conflictType,
    reason,
    confidence_score: conflictScore,
    evidence,
  };
}

/**
 * Build reasoning object for a match result.
 * 
 * @param {Object} proposal
 * @param {Object} reviewer
 * @param {number} relevanceScore
 * @param {number} conflictScore
 * @param {number} availabilityFactor
 * @returns {Object} Reasoning details
 */
export function buildReasoning(proposal, reviewer, relevanceScore, conflictScore, availabilityFactor) {
  const proposalKeywords = proposal.keywords || [];
  const reviewerExpertise = reviewer.expertise || [];

  const keywordMatches = proposalKeywords.filter(kw =>
    reviewerExpertise.some(exp =>
      exp.toLowerCase().includes(kw.toLowerCase()) ||
      kw.toLowerCase().includes(exp.toLowerCase())
    )
  );

  const areas = reviewer.areas || {};
  const areaMatches = [];
  Object.entries(areas).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (proposalKeywords.some(kw =>
          item.toLowerCase().includes(kw.toLowerCase()) ||
          kw.toLowerCase().includes(item.toLowerCase())
        )) {
          areaMatches.push(`${category}: ${item}`);
        }
      });
    }
  });

  const collaborators = proposal.collaborators || [];
  const publications = reviewer.publications || [];
  const recentYearThreshold = new Date().getFullYear() - 3;
  let publicationOverlap = 0;

  publications.forEach(pub => {
    if (pub.year >= recentYearThreshold) {
      collaborators.forEach(collab => {
        if (collab.name && pub.authors?.some(a =>
          a.toLowerCase().includes(collab.name.toLowerCase())
        )) {
          publicationOverlap++;
        }
      });
    }
  });

  return {
    relevance_factors: {
      keyword_matches: keywordMatches,
      area_matches: areaMatches,
      publication_overlap: publicationOverlap,
    },
    conflict_factors: {
      same_institution: proposal.tenant_id === reviewer.tenant_id,
      coauthorship_recent: conflictScore >= 0.8,
      workload_utilization: reviewer.current_assignments / (reviewer.workload_limit || 5),
    },
    availability_score: availabilityFactor,
  };
}

/**
 * Run the full matching algorithm for a proposal against a pool of reviewers.
 * 
 * @param {Object} proposal - Proposal data
 * @param {Array} reviewers - Array of reviewer profiles with user data
 * @param {number} topN - Number of top matches to return
 * @returns {Array} Sorted array of match results
 */
export function runMatchingAlgorithm(proposal, reviewers, topN = 10) {
  const results = [];

  for (const reviewer of reviewers) {
    // Skip if reviewer is at workload limit
    if (reviewer.current_assignments >= reviewer.workload_limit) {
      continue;
    }

    const relevanceScore = calculateRelevanceScore(proposal, reviewer);
    const conflictScore = calculateConflictScore(proposal, reviewer);

    // Skip high-conflict reviewers
    if (conflictScore >= 0.8) {
      continue;
    }

    const biasPenalty = reviewer.bias_score || 0.0;
    const availabilityFactor = calculateAvailabilityFactor(
      reviewer.current_assignments,
      reviewer.workload_limit
    );

    const finalScore = computeFinalScore(relevanceScore, conflictScore, biasPenalty, availabilityFactor);
    const reasoning = buildReasoning(proposal, reviewer, relevanceScore, conflictScore, availabilityFactor);

    results.push({
      reviewer_id: reviewer.user_id,
      reviewer_name: reviewer.full_name,
      reviewer_email: reviewer.email,
      expertise: reviewer.expertise || [],
      relevance_score: Math.round(relevanceScore * 100) / 100,
      conflict_score: Math.round(conflictScore * 100) / 100,
      bias_penalty: Math.round(biasPenalty * 100) / 100,
      final_score: Math.round(finalScore * 100) / 100,
      reasoning,
      current_assignments: reviewer.current_assignments,
      workload_limit: reviewer.workload_limit,
    });
  }

  // Sort by final score descending
  results.sort((a, b) => b.final_score - a.final_score);

  return results.slice(0, topN);
}
