# Legal Deposition Analysis - Project Plan

## Status: In Progress
Started: 2026-01-11

---

## Phase 1: Project Setup & Infrastructure (Days 1-2)

### 1.1 Initialize React + TypeScript Project
- [ ] Set up Vite project with React + TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up ESLint and Prettier
- [ ] Create basic folder structure

### 1.2 Configure GitHub Pages Deployment
- [ ] Create GitHub Actions workflow
- [ ] Configure Vite for GitHub Pages base path
- [ ] Test deployment pipeline

### 1.3 Environment & Configuration
- [ ] Create API key configuration system (secure client-side storage)
- [ ] Build settings/config UI component
- [ ] Implement key validation

---

## Phase 2: Core Parsing & Ingestion (Days 3-4)

### 2.1 File Upload System
- [ ] Build file upload component (drag & drop)
- [ ] Support PDF and TXT formats
- [ ] File validation and error handling

### 2.2 Text Extraction
- [ ] Implement TXT parser
- [ ] Integrate pdf.js for PDF parsing
- [ ] Preserve page numbers and line numbers

### 2.3 Utterance Parser
- [ ] Detect Q/A boundaries
- [ ] Identify speakers (Q vs A, attorney names)
- [ ] Generate citation anchors (page/line)
- [ ] Handle transcripts without line numbers (use char offsets)

---

## Phase 3: LLM Integration (Days 4-5)

### 3.1 OpenAI Client
- [ ] Create OpenAI API service
- [ ] Implement retry logic and error handling
- [ ] Add rate limiting awareness
- [ ] Mock mode for testing

### 3.2 Claim Extraction
- [ ] Design claim extraction prompt
- [ ] Implement claim extraction service
- [ ] Parse and validate JSON responses
- [ ] Extract: normalized_text, polarity, modality, timeScope, entities, topics
- [ ] Link claims back to utterances with citations

### 3.3 Prompts Library
- [ ] Create structured prompts file
- [ ] Claim extraction prompt (JSON output)
- [ ] Contradiction detection prompt (JSON output)
- [ ] Version control for prompts

---

## Phase 4: Vector Database & Semantic Search (Days 5-6)

### 4.1 Chroma Cloud Integration
- [ ] Create Chroma Cloud client service
- [ ] Initialize collections
- [ ] Implement add/query operations
- [ ] Error handling and connection management

### 4.2 Embedding Generation
- [ ] Use OpenAI embeddings API (text-embedding-3-large)
- [ ] Batch embedding generation
- [ ] Store embeddings in Chroma Cloud
- [ ] Link embeddings to claims

### 4.3 Retrieval System
- [ ] Semantic search (top-K similar claims)
- [ ] Lexical search by entities
- [ ] Cluster by topic/issue
- [ ] Metadata filtering

---

## Phase 5: Contradiction Detection (Days 6-8)

### 5.1 Candidate Generation
- [ ] For each claim, retrieve top-K semantically similar claims
- [ ] Filter by same entity
- [ ] Filter by same topic
- [ ] Generate candidate pairs (avoid duplicates)

### 5.2 Pairwise Classification
- [ ] Design contradiction judge prompt
- [ ] Classify pairs: CONSISTENT, HARD_CONTRADICTION, SOFT_INCONSISTENCY, SCOPE_SHIFT, TEMPORAL_CONFLICT, DEFINITION_DRIFT
- [ ] Extract explanation and confidence score
- [ ] Store contradiction records

### 5.3 Inconsistency Patterns
- [ ] Detect hedging changes ("always" → "sometimes")
- [ ] Identify memory volatility ("I don't recall" patterns)
- [ ] Track scope creep ("never responsible" → "oversaw")
- [ ] Timeline conflicts

---

## Phase 6: Report Generation (Days 8-9)

### 6.1 Report Builder
- [ ] Generate contradiction table
- [ ] Create issue summaries
- [ ] Build timeline view
- [ ] Include all citations (page/line)

### 6.2 Export Formats
- [ ] Markdown export
- [ ] HTML preview
- [ ] PDF generation (optional - via print)
- [ ] Copy to clipboard

### 6.3 Visualizations
- [ ] Contradiction heatmap by issue
- [ ] Timeline visualization
- [ ] Claim network graph (optional)

---

## Phase 7: UI/UX Polish (Days 9-10)

### 7.1 Main Interface Components
- [ ] Dashboard/home page
- [ ] File upload interface
- [ ] Processing status indicators
- [ ] Transcript viewer with highlighting
- [ ] Claims browser
- [ ] Contradictions explorer
- [ ] Report viewer

### 7.2 User Experience
- [ ] Loading states and progress bars
- [ ] Error messages and recovery
- [ ] Keyboard shortcuts
- [ ] Responsive design (mobile-friendly)

### 7.3 Data Management
- [ ] Local storage for documents and analysis
- [ ] Import/export analysis data
- [ ] Clear/reset functionality
- [ ] Multi-document support

---

## Phase 8: Testing & Documentation (Day 10)

### 8.1 Testing
- [ ] Unit tests for parsers
- [ ] Integration tests for API clients
- [ ] End-to-end test with sample transcript
- [ ] Edge case testing (malformed transcripts)

### 8.2 Documentation
- [ ] Update README with setup instructions
- [ ] User guide for the webapp
- [ ] API key setup instructions
- [ ] Sample transcript format examples
- [ ] Troubleshooting guide

### 8.3 Sample Data
- [ ] Create sample deposition transcript
- [ ] Include example with known contradictions
- [ ] Document expected outputs

---

## Phase 9: Deployment & Launch

### 9.1 Pre-launch Checklist
- [ ] Security audit (API key handling)
- [ ] Performance optimization
- [ ] Browser compatibility testing
- [ ] Mobile responsiveness check

### 9.2 Deployment
- [ ] Push to GitHub
- [ ] Verify GitHub Actions workflow
- [ ] Test live deployment
- [ ] Configure custom domain (if needed)

### 9.3 Post-launch
- [ ] Monitor for issues
- [ ] Gather user feedback
- [ ] Plan v1.1 features

---

## Future Enhancements (Post-MVP)

- [ ] Multi-transcript comparison (depo vs depo)
- [ ] Affidavit comparison
- [ ] Speaker identification improvements
- [ ] Attorney name parsing
- [ ] Timeline extraction and visualization
- [ ] Redaction mode + PII controls
- [ ] Export to legal research platforms
- [ ] Collaborative features (team access)
- [ ] Advanced filtering and search
- [ ] Custom contradiction rules
- [ ] Integration with case management systems

---

## Technical Debt & Known Limitations

- **Client-side processing**: Large transcripts (1000+ pages) may cause performance issues
- **API costs**: OpenAI API calls can be expensive for large transcripts
- **Rate limiting**: Need to handle OpenAI rate limits gracefully
- **Data persistence**: Using browser local storage (limited capacity)
- **No backend**: All processing happens in browser (security considerations for API keys)

## Potential Solutions for Limitations
- Implement chunking for large transcripts
- Add cost estimation before processing
- Implement exponential backoff for rate limits
- Add export/import for data portability
- Future: Optional backend for enterprise users
