'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Send, Trash2, Eye, Clock, CheckCircle, XCircle, AlertCircle, 
  Edit3, X, Tag, FilePlus, ArrowRight, Calendar, User, Save, AlertTriangle,
  CheckCircle2, FileText, Search, Filter, RefreshCw, MoreVertical, Building2,
  Globe, Target, Users, DollarSign, Shield, Lightbulb, BookOpen, FlaskConical,
  TrendingUp, Award, ChevronDown, ChevronUp, Layers, Link2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard, StatusBadge, LoadingSpinner, Alert, EmptyState, Card, Badge } from '@/components/ui';

function ProposalModal({ proposal, onClose, onSave, token }) {
  // State for all form fields
  // Basic Info
  const [title, setTitle] = useState(proposal?.title || '');
  const [abstract, setAbstract] = useState(proposal?.abstract || '');
  const [keywordsInput, setKeywordsInput] = useState((proposal?.keywords || []).join(', '));
  
  // Funder Context
  const [funderName, setFunderName] = useState(proposal?.funder_name || '');
  const [fundingScheme, setFundingScheme] = useState(proposal?.funding_scheme || '');
  const [callReference, setCallReference] = useState(proposal?.call_reference || '');
  const [callLink, setCallLink] = useState(proposal?.call_link || '');
  const [reviewPanelType, setReviewPanelType] = useState(proposal?.review_panel_type || '');
  const [discipline, setDiscipline] = useState(proposal?.discipline || '');
  const [fundingAmount, setFundingAmount] = useState(proposal?.funding_amount_requested || '');
  const [projectDuration, setProjectDuration] = useState(proposal?.project_duration_months || '');
  const [deadline, setDeadline] = useState(proposal?.deadline ? proposal.deadline.split('T')[0] : '');
  const [funderCountry, setFunderCountry] = useState(proposal?.funder_country || '');
  
  // Proposal Stage
  const [proposalStage, setProposalStage] = useState(proposal?.proposal_stage || 'concept');
  
  // Research Context
  const [researchProblem, setResearchProblem] = useState(proposal?.research_problem || '');
  const [currentStateOfArt, setCurrentStateOfArt] = useState(proposal?.current_state_of_the_art || '');
  const [knowledgeGap, setKnowledgeGap] = useState(proposal?.knowledge_gap || '');
  const [researchQuestions, setResearchQuestions] = useState(proposal?.research_questions || '');
  const [hypotheses, setHypotheses] = useState(proposal?.hypotheses || '');
  
  // Methodology
  const [studyDesign, setStudyDesign] = useState(proposal?.study_design || '');
  const [methods, setMethods] = useState(proposal?.methods || '');
  const [dataSources, setDataSources] = useState(proposal?.data_sources || '');
  const [sampleSize, setSampleSize] = useState(proposal?.sample_size || '');
  const [analysisPlan, setAnalysisPlan] = useState(proposal?.analysis_plan || '');
  const [riskMitigation, setRiskMitigation] = useState(proposal?.risk_mitigation || '');
  
  // Impact
  const [scientificContribution, setScientificContribution] = useState(proposal?.expected_scientific_contribution || '');
  const [societalImpact, setSocietalImpact] = useState(proposal?.societal_impact || '');
  const [policyRelevance, setPolicyRelevance] = useState(proposal?.policy_relevance || '');
  const [innovationLevel, setInnovationLevel] = useState(proposal?.innovation_level || 'incremental');
  
  // Team
  const [piExpertise, setPiExpertise] = useState(proposal?.pi_expertise || '');
  const [teamTrackRecord, setTeamTrackRecord] = useState(proposal?.team_track_record || '');
  const [teamCollaborators, setTeamCollaborators] = useState(proposal?.team_collaborators || []);
  const [previousGrants, setPreviousGrants] = useState(proposal?.previous_grants || []);
  
  // Budget
  const [totalBudget, setTotalBudget] = useState(proposal?.total_budget || '');
  const [budgetJustification, setBudgetJustification] = useState(proposal?.budget_justification || '');
  
  // Ethics
  const [ethicsRequired, setEthicsRequired] = useState(proposal?.ethics_required || false);
  const [humanSubjects, setHumanSubjects] = useState(proposal?.human_subjects || false);
  const [animalResearch, setAnimalResearch] = useState(proposal?.animal_research || false);
  const [dataProtection, setDataProtection] = useState(proposal?.data_protection || '');
  const [openSciencePlan, setOpenSciencePlan] = useState(proposal?.open_science_plan || '');
  
  // Feedback Priorities
  const [feedbackPriorities, setFeedbackPriorities] = useState(proposal?.feedback_priorities || []);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    funder: true,
    stage: true,
    research: true,
    methodology: true,
    impact: true,
    team: true,
    budget: true,
    ethics: true,
    feedback: true
  });
  
  const autoSaveTimeoutRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || saving) return;
    
    const timer = setTimeout(() => {
      handleSave(false, true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges]);

  const handleChange = (setter, field) => (e) => {
    setter(e.target.value);
    setHasUnsavedChanges(true);
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFeedbackPriority = (priority) => {
    setFeedbackPriorities(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
    setHasUnsavedChanges(true);
  };

  const addCollaborator = () => {
    setTeamCollaborators([...teamCollaborators, { name: '', institution: '', role: '' }]);
    setHasUnsavedChanges(true);
  };

  const updateCollaborator = (index, field, value) => {
    const updated = [...teamCollaborators];
    updated[index][field] = value;
    setTeamCollaborators(updated);
    setHasUnsavedChanges(true);
  };

  const removeCollaborator = (index) => {
    setTeamCollaborators(teamCollaborators.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const addGrant = () => {
    setPreviousGrants([...previousGrants, { funder: '', title: '', amount: '', year: '' }]);
    setHasUnsavedChanges(true);
  };

  const updateGrant = (index, field, value) => {
    const updated = [...previousGrants];
    updated[index][field] = value;
    setPreviousGrants(updated);
    setHasUnsavedChanges(true);
  };

  const removeGrant = (index) => {
    setPreviousGrants(previousGrants.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const validate = () => {
    const errors = [];
    if (!title.trim()) errors.push('Title is required');
    if (!abstract.trim()) errors.push('Abstract is required');
    if (title.length < 10) errors.push('Title must be at least 10 characters');
    if (abstract.length < 50) errors.push('Abstract must be at least 50 characters');
    if (!funderName.trim() && proposalStage !== 'concept') errors.push('Funder name is required');
    return errors;
  };

  const handleSave = async (submit = false, isAutoSave = false) => {
    const errors = validate();
    if (errors.length > 0 && !isAutoSave) {
      setError(errors.join(', '));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);

      const proposalData = { 
        title, 
        abstract, 
        keywords,
        // Funder Context
        funder_name: funderName || undefined,
        funding_scheme: fundingScheme || undefined,
        call_reference: callReference || undefined,
        call_link: callLink || undefined,
        review_panel_type: reviewPanelType || undefined,
        discipline: discipline || undefined,
        funding_amount_requested: fundingAmount ? parseFloat(fundingAmount) : undefined,
        project_duration_months: projectDuration ? parseInt(projectDuration) : undefined,
        deadline: deadline || undefined,
        funder_country: funderCountry || undefined,
        // Proposal Stage
        proposal_stage: proposalStage || undefined,
        // Research Context
        research_problem: researchProblem || undefined,
        current_state_of_the_art: currentStateOfArt || undefined,
        knowledge_gap: knowledgeGap || undefined,
        research_questions: researchQuestions || undefined,
        hypotheses: hypotheses || undefined,
        // Methodology
        study_design: studyDesign || undefined,
        methods: methods || undefined,
        data_sources: dataSources || undefined,
        sample_size: sampleSize || undefined,
        analysis_plan: analysisPlan || undefined,
        risk_mitigation: riskMitigation || undefined,
        // Impact
        expected_scientific_contribution: scientificContribution || undefined,
        societal_impact: societalImpact || undefined,
        policy_relevance: policyRelevance || undefined,
        innovation_level: innovationLevel || undefined,
        // Team
        pi_expertise: piExpertise || undefined,
        team_track_record: teamTrackRecord || undefined,
        team_collaborators: teamCollaborators.length > 0 ? teamCollaborators : undefined,
        previous_grants: previousGrants.length > 0 ? previousGrants : undefined,
        // Budget
        total_budget: totalBudget ? parseFloat(totalBudget) : undefined,
        budget_justification: budgetJustification || undefined,
        // Ethics
        ethics_required: ethicsRequired,
        human_subjects: humanSubjects,
        animal_research: animalResearch,
        data_protection: dataProtection || undefined,
        open_science_plan: openSciencePlan || undefined,
        // Feedback
        feedback_priorities: feedbackPriorities.length > 0 ? feedbackPriorities : undefined,
      };
      
      if (submit) proposalData.status = 'submitted';

      if (proposal?.id) {
        const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(proposalData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const res = await fetch('/api/v1/proposals', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(proposalData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (submit && data.proposal?.id) {
          await fetch(`/api/v1/proposals/${data.proposal.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'submitted' }),
          });
        }
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSave();
      onClose();
    } catch (err) {
      if (!isAutoSave) {
        setError(err.message || 'Failed to save proposal');
      }
    } finally {
      setSaving(false);
    }
  };

  const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);
  
  const getCharacterCountClass = (current, min, max) => {
    if (current < min) return 'text-rose-500';
    if (current > max) return 'text-rose-500';
    return 'text-emerald-600';
  };

  const SectionHeader = ({ id, icon: Icon, title, description }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {expandedSections[id] ? (
        <ChevronUp className="h-5 w-5 text-slate-400" />
      ) : (
        <ChevronDown className="h-5 w-5 text-slate-400" />
      )}
    </button>
  );

  const TextField = ({ label, value, onChange, onBlur, placeholder, required, rows = 3, maxLength, section }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={handleChange(onChange, section)}
        onBlur={handleBlur(section)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="input resize-none"
      />
      {maxLength && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${getCharacterCountClass(value.length, 0, maxLength)}`}>
          <Clock className="h-3 w-3" />
          {value.length}/{maxLength} characters
        </div>
      )}
    </div>
  );

  const InputField = ({ label, value, onChange, onBlur, placeholder, required, type = "text", section }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={handleChange(onChange, section)}
        onBlur={handleBlur(section)}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );

  const feedbackOptions = [
    { id: 'novelty', label: 'Novelty & Originality' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'feasibility', label: 'Feasibility' },
    { id: 'clarity', label: 'Clarity & Presentation' },
    { id: 'impact', label: 'Impact & Significance' },
    { id: 'competitiveness', label: 'Competitiveness' },
    { id: 'panel_fit', label: 'Panel Fit' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-4xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {proposal?.id ? 'Edit Proposal' : 'New Grant Proposal'}
            </h2>
            {hasUnsavedChanges && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 max-h-[65vh] space-y-4">
          {error && (
            <Alert type="error" message={error} onDismiss={() => setError('')} />
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Proposal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={handleChange(setTitle, 'title')}
              onBlur={handleBlur('title')}
              placeholder="Enter a descriptive title for your grant proposal"
              className={`input ${touched.title && !title.trim() ? 'border-rose-300 focus:border-rose-500' : ''}`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-xs text-slate-400">
                {touched.title && title.length < 10 && (
                  <span className="text-rose-500">Minimum 10 characters required</span>
                )}
              </div>
              <div className={`text-xs ${getCharacterCountClass(title.length, 10, 200)}`}>
                {title.length}/200
              </div>
            </div>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Executive Summary / Abstract <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={abstract}
              onChange={handleChange(setAbstract, 'abstract')}
              onBlur={handleBlur('abstract')}
              placeholder="Provide a comprehensive summary of your research proposal, including objectives, methodology, and expected outcomes..."
              rows={6}
              className={`input resize-none ${touched.abstract && abstract.length < 50 ? 'border-rose-300 focus:border-rose-500' : ''}`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-xs text-slate-400">
                {touched.abstract && abstract.length < 50 && (
                  <span className="text-rose-500">Minimum 50 characters required</span>
                )}
              </div>
              <div className={`text-xs flex items-center gap-1 ${getCharacterCountClass(abstract.length, 50, 3000)}`}>
                <Clock className="h-3 w-3" />
                {abstract.length}/3000 characters
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Keywords <span className="text-slate-400 font-normal">(helps match with reviewers)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => {
                  setKeywordsInput(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="machine learning, deep learning, computer vision (comma-separated)"
                className="input pl-10"
              />
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {keywords.map(kw => (
                  <Badge key={kw} color="indigo">{kw}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Proposal Stage */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Proposal Stage <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">Reviewers must know the maturity of your proposal</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['concept', 'outline', 'near-final', 'final'].map(stage => (
                <button
                  key={stage}
                  onClick={() => {
                    setProposalStage(stage);
                    setHasUnsavedChanges(true);
                  }}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    proposalStage === stage
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                  }`}
                >
                  {stage === 'concept' ? '💡 Concept' : 
                   stage === 'outline' ? '📝 Outline' : 
                   stage === 'near-final' ? '🎯 Near-Final' : '✅ Final'}
                </button>
              ))}
            </div>
          </div>

          {/* Funder Context Section */}
          <SectionHeader 
            id="funder" 
            icon={Building2} 
            title="Funder Context" 
            description="Essential information about the funding source"
          />
          {expandedSections.funder && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Funder Name"
                  value={funderName}
                  onChange={setFunderName}
                  onBlur={handleBlur('funder_name')}
                  placeholder="e.g., UK Research and Innovation"
                  section="funder_name"
                />
                <InputField
                  label="Funding Scheme"
                  value={fundingScheme}
                  onChange={setFundingScheme}
                  onBlur={handleBlur('funding_scheme')}
                  placeholder="e.g., Horizon Europe, Marie Curie"
                  section="funding_scheme"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Call Reference"
                  value={callReference}
                  onChange={setCallReference}
                  onBlur={handleBlur('call_reference')}
                  placeholder="e.g., ERC-2024-STG"
                  section="call_reference"
                />
                <InputField
                  label="Call Link"
                  value={callLink}
                  onChange={setCallLink}
                  onBlur={handleBlur('call_link')}
                  placeholder="URL to funding call"
                  section="call_link"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Review Panel Type</label>
                  <select
                    value={reviewPanelType}
                    onChange={(e) => {
                      setReviewPanelType(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="input"
                  >
                    <option value="">Select panel type</option>
                    <option value="physical">Physical Sciences</option>
                    <option value="life">Life Sciences</option>
                    <option value="social">Social Sciences</option>
                    <option value="engineering">Engineering</option>
                    <option value="humanities">Humanities</option>
                    <option value="interdisciplinary">Interdisciplinary</option>
                  </select>
                </div>
                <InputField
                  label="Discipline"
                  value={discipline}
                  onChange={setDiscipline}
                  onBlur={handleBlur('discipline')}
                  placeholder="e.g., Computer Science"
                  section="discipline"
                />
                <InputField
                  label="Funder Country"
                  value={funderCountry}
                  onChange={setFunderCountry}
                  onBlur={handleBlur('funder_country')}
                  placeholder="e.g., United Kingdom"
                  section="funder_country"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField
                  label="Funding Amount Requested"
                  value={fundingAmount}
                  onChange={setFundingAmount}
                  onBlur={handleBlur('funding_amount')}
                  placeholder="e.g., 500000"
                  type="number"
                  section="funding_amount"
                />
                <InputField
                  label="Project Duration (months)"
                  value={projectDuration}
                  onChange={setProjectDuration}
                  onBlur={handleBlur('project_duration')}
                  placeholder="e.g., 36"
                  type="number"
                  section="project_duration"
                />
                <InputField
                  label="Application Deadline"
                  value={deadline}
                  onChange={setDeadline}
                  onBlur={handleBlur('deadline')}
                  type="date"
                  section="deadline"
                />
              </div>
            </div>
          )}

          {/* Research Context Section */}
          <SectionHeader 
            id="research" 
            icon={Target} 
            title="Research Context" 
            description="The problem, gap, and questions you're addressing"
          />
          {expandedSections.research && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <TextField
                label="Research Problem"
                value={researchProblem}
                onChange={setResearchProblem}
                onBlur={handleBlur('research_problem')}
                placeholder="What problem are you solving? Why is it important?"
                rows={4}
                maxLength={2000}
                section="research_problem"
              />
              <TextField
                label="Current State of the Art"
                value={currentStateOfArt}
                onChange={setCurrentStateOfArt}
                onBlur={handleBlur('current_state_of_the_art')}
                placeholder="What currently exists? What are the limitations of current approaches?"
                rows={4}
                maxLength={2000}
                section="current_state_of_the_art"
              />
              <TextField
                label="Knowledge Gap"
                value={knowledgeGap}
                onChange={setKnowledgeGap}
                onBlur={handleBlur('knowledge_gap')}
                placeholder="What knowledge gap does your research fill?"
                rows={3}
                maxLength={1500}
                section="knowledge_gap"
              />
              <TextField
                label="Research Questions"
                value={researchQuestions}
                onChange={setResearchQuestions}
                onBlur={handleBlur('research_questions')}
                placeholder="What specific questions will your research answer?"
                rows={3}
                maxLength={1000}
                section="research_questions"
              />
              <TextField
                label="Hypotheses"
                value={hypotheses}
                onChange={setHypotheses}
                onBlur={handleBlur('hypotheses')}
                placeholder="What are your testable hypotheses?"
                rows={3}
                maxLength={1000}
                section="hypotheses"
              />
            </div>
          )}

          {/* Methodology Section */}
          <SectionHeader 
            id="methodology" 
            icon={FlaskConical} 
            title="Methodology" 
            description="How you will conduct the research"
          />
          {expandedSections.methodology && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <TextField
                label="Study Design"
                value={studyDesign}
                onChange={setStudyDesign}
                onBlur={handleBlur('study_design')}
                placeholder="What is your overall research design?"
                rows={3}
                maxLength={1500}
                section="study_design"
              />
              <TextField
                label="Methods"
                value={methods}
                onChange={setMethods}
                onBlur={handleBlur('methods')}
                placeholder="What specific methods will you use?"
                rows={4}
                maxLength={2000}
                section="methods"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Data Sources"
                  value={dataSources}
                  onChange={setDataSources}
                  onBlur={handleBlur('data_sources')}
                  placeholder="Where will you get your data?"
                  rows={3}
                  maxLength={1000}
                  section="data_sources"
                />
                <TextField
                  label="Sample Size"
                  value={sampleSize}
                  onChange={setSampleSize}
                  onBlur={handleBlur('sample_size')}
                  placeholder="What is your target sample size? How did you determine it?"
                  rows={3}
                  maxLength={500}
                  section="sample_size"
                />
              </div>
              <TextField
                label="Analysis Plan"
                value={analysisPlan}
                onChange={setAnalysisPlan}
                onBlur={handleBlur('analysis_plan')}
                placeholder="How will you analyze the data?"
                rows={3}
                maxLength={1500}
                section="analysis_plan"
              />
              <TextField
                label="Risk Mitigation"
                value={riskMitigation}
                onChange={setRiskMitigation}
                onBlur={handleBlur('risk_mitigation')}
                placeholder="What risks could affect your research and how will you mitigate them?"
                rows={3}
                maxLength={1000}
                section="risk_mitigation"
              />
            </div>
          )}

          {/* Impact Section */}
          <SectionHeader 
            id="impact" 
            icon={TrendingUp} 
            title="Impact & Significance" 
            description="Expected outcomes and broader impacts"
          />
          {expandedSections.impact && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <TextField
                label="Expected Scientific Contribution"
                value={scientificContribution}
                onChange={setScientificContribution}
                onBlur={handleBlur('expected_scientific_contribution')}
                placeholder="What new knowledge or advances will your research contribute to the field?"
                rows={4}
                maxLength={2000}
                section="expected_scientific_contribution"
              />
              <TextField
                label="Societal Impact"
                value={societalImpact}
                onChange={setSocietalImpact}
                onBlur={handleBlur('societal_impact')}
                placeholder="How will your research benefit society?"
                rows={3}
                maxLength={1500}
                section="societal_impact"
              />
              <TextField
                label="Policy Relevance"
                value={policyRelevance}
                onChange={setPolicyRelevance}
                onBlur={handleBlur('policy_relevance')}
                placeholder="How does your research inform policy?"
                rows={2}
                maxLength={1000}
                section="policy_relevance"
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Innovation Level</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'incremental', label: '🔧 Incremental' },
                    { id: 'significant', label: '⭐ Significant' },
                    { id: 'breakthrough', label: '🚀 Breakthrough' },
                    { id: 'paradigm', label: '💎 Paradigm Shift' }
                  ].map(level => (
                    <button
                      key={level.id}
                      onClick={() => {
                        setInnovationLevel(level.id);
                        setHasUnsavedChanges(true);
                      }}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        innovationLevel === level.id
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team Section */}
          <SectionHeader 
            id="team" 
            icon={Users} 
            title="Team Information" 
            description="Your qualifications and team capabilities"
          />
          {expandedSections.team && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <TextField
                label="PI Expertise"
                value={piExpertise}
                onChange={setPiExpertise}
                onBlur={handleBlur('pi_expertise')}
                placeholder="What are your relevant qualifications and expertise?"
                rows={3}
                maxLength={1500}
                section="pi_expertise"
              />
              <TextField
                label="Team Track Record"
                value={teamTrackRecord}
                onChange={setTeamTrackRecord}
                onBlur={handleBlur('team_track_record')}
                placeholder="What relevant achievements does your team have?"
                rows={3}
                maxLength={1500}
                section="team_track_record"
              />
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Team Collaborators</label>
                  <button
                    onClick={addCollaborator}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Collaborator
                  </button>
                </div>
                {teamCollaborators.map((collab, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-start">
                    <input
                      type="text"
                      value={collab.name}
                      onChange={(e) => updateCollaborator(index, 'name', e.target.value)}
                      placeholder="Name"
                      className="input flex-1"
                    />
                    <input
                      type="text"
                      value={collab.institution}
                      onChange={(e) => updateCollaborator(index, 'institution', e.target.value)}
                      placeholder="Institution"
                      className="input flex-1"
                    />
                    <input
                      type="text"
                      value={collab.role}
                      onChange={(e) => updateCollaborator(index, 'role', e.target.value)}
                      placeholder="Role"
                      className="input w-32"
                    />
                    <button
                      onClick={() => removeCollaborator(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Previous Grants</label>
                  <button
                    onClick={addGrant}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Previous Grant
                  </button>
                </div>
                {previousGrants.map((grant, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-start">
                    <input
                      type="text"
                      value={grant.funder}
                      onChange={(e) => updateGrant(index, 'funder', e.target.value)}
                      placeholder="Funder"
                      className="input flex-1"
                    />
                    <input
                      type="text"
                      value={grant.title}
                      onChange={(e) => updateGrant(index, 'title', e.target.value)}
                      placeholder="Project Title"
                      className="input flex-1"
                    />
                    <input
                      type="text"
                      value={grant.amount}
                      onChange={(e) => updateGrant(index, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="input w-28"
                    />
                    <input
                      type="text"
                      value={grant.year}
                      onChange={(e) => updateGrant(index, 'year', e.target.value)}
                      placeholder="Year"
                      className="input w-20"
                    />
                    <button
                      onClick={() => removeGrant(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Section */}
          <SectionHeader 
            id="budget" 
            icon={DollarSign} 
            title="Budget Summary" 
            description="Financial overview for reviewers"
          />
          {expandedSections.budget && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Total Budget Requested"
                  value={totalBudget}
                  onChange={setTotalBudget}
                  onBlur={handleBlur('total_budget')}
                  placeholder="e.g., 500000"
                  type="number"
                  section="total_budget"
                />
              </div>
              <TextField
                label="Budget Justification"
                value={budgetJustification}
                onChange={setBudgetJustification}
                onBlur={handleBlur('budget_justification')}
                placeholder="Explain how the budget will be allocated and why each item is necessary..."
                rows={4}
                maxLength={2000}
                section="budget_justification"
              />
            </div>
          )}

          {/* Ethics Section */}
          <SectionHeader 
            id="ethics" 
            icon={Shield} 
            title="Ethical & Compliance Issues" 
            description="Required for ethical review"
          />
          {expandedSections.ethics && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ethicsRequired}
                    onChange={(e) => {
                      setEthicsRequired(e.target.checked);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Ethics Approval Required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={humanSubjects}
                    onChange={(e) => {
                      setHumanSubjects(e.target.checked);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Human Subjects</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={animalResearch}
                    onChange={(e) => {
                      setAnimalResearch(e.target.checked);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Animal Research</span>
                </label>
              </div>
              <TextField
                label="Data Protection"
                value={dataProtection}
                onChange={setDataProtection}
                onBlur={handleBlur('data_protection')}
                placeholder="How will you ensure data protection and privacy?"
                rows={2}
                maxLength={1000}
                section="data_protection"
              />
              <TextField
                label="Open Science Plan"
                value={openSciencePlan}
                onChange={setOpenSciencePlan}
                onBlur={handleBlur('open_science_plan')}
                placeholder="How will you share data, code, and publications?"
                rows={2}
                maxLength={1000}
                section="open_science_plan"
              />
            </div>
          )}

          {/* Feedback Priorities Section */}
          <SectionHeader 
            id="feedback" 
            icon={Lightbulb} 
            title="Feedback Priorities" 
            description="What aspects do you want reviewers to focus on?"
          />
          {expandedSections.feedback && (
            <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
              <p className="text-xs text-slate-500">Select the areas where you&apos;d like the most detailed feedback:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {feedbackOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => toggleFeedbackPriority(option.id)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all text-left ${
                      feedbackPriorities.includes(option.id)
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {feedbackPriorities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {feedbackPriorities.map(fp => (
                    <Badge key={fp} color="indigo">
                      {feedbackOptions.find(o => o.id === fp)?.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn-secondary"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="h-4 w-4" />}
              Submit Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// DetailSection component for displaying proposal detail sections
function DetailSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-indigo-600" />
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function ProposalDetailModal({ proposal, onClose, token }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(() => {
    fetch(`/api/v1/proposals/${proposal.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setDetail(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [proposal.id, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-4xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Proposal Details</h2>
            {detail?.proposal && <StatusBadge status={detail.proposal.status} />}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 max-h-[65vh]">
          {loading ? (
            <LoadingSpinner />
          ) : detail ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{detail.proposal?.title}</h3>
                
                {/* Proposal Stage & Funder */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {detail.proposal?.proposal_stage && (
                    <Badge color="amber">{detail.proposal.proposal_stage}</Badge>
                  )}
                  {detail.proposal?.funder_name && (
                    <Badge color="indigo">{detail.proposal.funder_name}</Badge>
                  )}
                  {detail.proposal?.discipline && (
                    <Badge color="purple">{detail.proposal.discipline}
                  </Badge>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-600 leading-relaxed">{detail.proposal?.abstract}</p>
                </div>
              </div>

              {/* Funder Context */}
              {(detail.proposal?.funder_name || detail.proposal?.funding_amount_requested) && (
                <DetailSection title="Funder Context" icon={Building2}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {detail.proposal?.funder_name && (
                      <div><span className="text-slate-500">Funder:</span> {detail.proposal.funder_name}</div>
                    )}
                    {detail.proposal?.funding_scheme && (
                      <div><span className="text-slate-500">Scheme:</span> {detail.proposal.funding_scheme}</div>
                    )}
                    {detail.proposal?.funding_amount_requested && (
                      <div><span className="text-slate-500">Amount:</span> ${detail.proposal.funding_amount_requested.toLocaleString()}</div>
                    )}
                    {detail.proposal?.project_duration_months && (
                      <div><span className="text-slate-500">Duration:</span> {detail.proposal.project_duration_months} months</div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Research Context */}
              {detail.proposal?.research_problem && (
                <DetailSection title="Research Context" icon={Target}>
                  <div className="space-y-3 text-sm">
                    {detail.proposal.research_problem && (
                      <div><span className="text-slate-500">Problem:</span> {detail.proposal.research_problem}</div>
                    )}
                    {detail.proposal.current_state_of_the_art && (
                      <div><span className="text-slate-500">State of Art:</span> {detail.proposal.current_state_of_the_art}</div>
                    )}
                    {detail.proposal.knowledge_gap && (
                      <div><span className="text-slate-500">Knowledge Gap:</span> {detail.proposal.knowledge_gap}</div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Methodology */}
              {detail.proposal?.methods && (
                <DetailSection title="Methodology" icon={FlaskConical}>
                  <div className="space-y-3 text-sm">
                    {detail.proposal.study_design && (
                      <div><span className="text-slate-500">Design:</span> {detail.proposal.study_design}</div>
                    )}
                    {detail.proposal.methods && (
                      <div><span className="text-slate-500">Methods:</span> {detail.proposal.methods}</div>
                    )}
                    {detail.proposal.risk_mitigation && (
                      <div><span className="text-slate-500">Risk Mitigation:</span> {detail.proposal.risk_mitigation}</div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Impact */}
              {(detail.proposal?.expected_scientific_contribution || detail.proposal?.societal_impact) && (
                <DetailSection title="Impact & Significance" icon={TrendingUp}>
                  <div className="space-y-3 text-sm">
                    {detail.proposal.expected_scientific_contribution && (
                      <div><span className="text-slate-500">Scientific:</span> {detail.proposal.expected_scientific_contribution}</div>
                    )}
                    {detail.proposal.societal_impact && (
                      <div><span className="text-slate-500">Societal:</span> {detail.proposal.societal_impact}</div>
                    )}
                    {detail.proposal.innovation_level && (
                      <div><span className="text-slate-500">Innovation:</span> {detail.proposal.innovation_level}</div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Team */}
              {(detail.proposal?.pi_expertise || detail.proposal?.team_track_record) && (
                <DetailSection title="Team" icon={Users}>
                  <div className="space-y-3 text-sm">
                    {detail.proposal.pi_expertise && (
                      <div><span className="text-slate-500">PI Expertise:</span> {detail.proposal.pi_expertise}</div>
                    )}
                    {detail.proposal.team_track_record && (
                      <div><span className="text-slate-500">Track Record:</span> {detail.proposal.team_track_record}</div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Budget */}
              {detail.proposal?.total_budget && (
                <DetailSection title="Budget" icon={DollarSign}>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">Total:</span> ${detail.proposal.total_budget.toLocaleString()}</div>
                    {detail.proposal.budget_justification && (
                      <div><span className="text-slate-500">Justification:</span> {detail.proposal.budget_justification}</div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Ethics */}
              {(detail.proposal?.ethics_required || detail.proposal?.data_protection) && (
                <DetailSection title="Ethics & Compliance" icon={Shield}>
                  <div className="flex flex-wrap gap-2">
                    {detail.proposal.ethics_required && <Badge color="red">Ethics Required</Badge>}
                    {detail.proposal.human_subjects && <Badge color="amber">Human Subjects</Badge>}
                    {detail.proposal.animal_research && <Badge color="amber">Animal Research</Badge>}
                    {detail.proposal.data_protection && (
                      <span className="text-sm text-slate-600">{detail.proposal.data_protection}</span>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Feedback Priorities */}
              {detail.proposal?.feedback_priorities?.length > 0 && (
                <DetailSection title="Feedback Priorities" icon={Lightbulb}>
                  <div className="flex flex-wrap gap-2">
                    {detail.proposal.feedback_priorities.map(fp => (
                      <Badge key={fp} color="indigo">{fp}</Badge>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Keywords */}
              {detail.proposal?.keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.proposal.keywords.map(kw => (
                      <Badge key={kw} color="indigo">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created: {detail.proposal?.created_at ? new Date(detail.proposal.created_at).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Submitted: {detail.proposal?.submitted_at ? new Date(detail.proposal.submitted_at).toLocaleDateString() : 'Not submitted'}
                </div>
              </div>

              {detail.reviews?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Reviews ({detail.reviews.length})</h4>
                  <div className="space-y-2">
                    {detail.reviews.map(review => (
                      <div key={review.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-semibold">
                            {(review.reviewer_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{review.reviewer_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Assigned {new Date(review.assigned_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={review.status} type="review" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">Failed to load proposal details</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [viewingProposal, setViewingProposal] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedTenant = localStorage.getItem('auth_tenant');

    if (!storedToken || !storedUser) {
      window.location.href = '/login';
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    setTenant(storedTenant ? JSON.parse(storedTenant) : null);
    fetchProposals(storedToken);
  }, []);

  const fetchProposals = async (authToken) => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/proposals', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProposals(data.proposals);
      } else {
        setError(data.error || 'Failed to fetch proposals');
      }
    } catch (err) {
      setError('Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    fetchProposals(token);
  };

  const statusConfig = {
    draft: { color: 'slate', label: 'Draft', icon: FileText },
    submitted: { color: 'blue', label: 'Submitted', icon: Send },
    under_review: { color: 'amber', label: 'Under Review', icon: Clock },
    accepted: { color: 'emerald', label: 'Accepted', icon: CheckCircle },
    rejected: { color: 'rose', label: 'Rejected', icon: XCircle },
    withdrawn: { color: 'slate', label: 'Withdrawn', icon: AlertTriangle },
  };

  return (
    <DashboardLayout user={user} tenant={tenant}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Proposals</h1>
            <p className="text-slate-600">Manage your grant applications</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Proposal
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Proposals', value: proposals.length, icon: FileText, color: 'indigo' },
            { label: 'Drafts', value: proposals.filter(p => p.status === 'draft').length, icon: Edit3, color: 'slate' },
            { label: 'Submitted', value: proposals.filter(p => p.status === 'submitted').length, icon: Send, color: 'blue' },
            { label: 'Under Review', value: proposals.filter(p => p.status === 'under_review').length, icon: Clock, color: 'amber' },
          ].map((stat, idx) => (
            <StatCard key={idx} {...stat} />
          ))}
        </div>

        {/* Proposals List */}
        <Card>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Alert type="error" message={error} onDismiss={() => setError('')} />
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proposals yet"
              description="Start by creating your first grant proposal"
              action={{
                label: 'Create Proposal',
                onClick: () => setShowNewModal(true)
              }}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {proposals.map((proposal) => {
                const config = statusConfig[proposal.status] || statusConfig.draft;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={proposal.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">{proposal.title}</h3>
                          <StatusBadge status={proposal.status} />
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                          {proposal.abstract}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {proposal.funder_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {proposal.funder_name}
                            </span>
                          )}
                          {proposal.discipline && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {proposal.discipline}
                            </span>
                          )}
                          {proposal.proposal_stage && (
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {proposal.proposal_stage}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                          {proposal.review_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {proposal.review_count} reviews
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingProposal(proposal)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {proposal.status === 'draft' && (
                          <button
                            onClick={() => setEditingProposal(proposal)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      {showNewModal && (
        <ProposalModal
          proposal={null}
          onClose={() => setShowNewModal(false)}
          onSave={handleSave}
          token={token}
        />
      )}

      {editingProposal && (
        <ProposalModal
          proposal={editingProposal}
          onClose={() => setEditingProposal(null)}
          onSave={handleSave}
          token={token}
        />
      )}

      {viewingProposal && (
        <ProposalDetailModal
          proposal={viewingProposal}
          onClose={() => setViewingProposal(null)}
          token={token}
        />
      )}
    </DashboardLayout>
  );
}
