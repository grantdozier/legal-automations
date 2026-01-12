# Legal Deposition Analysis Tool

An automated system for analyzing legal deposition transcripts, extracting claims, and detecting contradictions with precise citations.

## Features

- **Automated Parsing**: Extracts Q&A utterances from PDF and TXT deposition transcripts
- **Claim Extraction**: Uses GPT-4 to extract atomic claims from witness testimony
- **Semantic Search**: Leverages vector embeddings for intelligent claim matching
- **Contradiction Detection**: Identifies hard contradictions, soft inconsistencies, scope shifts, temporal conflicts, and definition drifts
- **Citation Tracking**: Maintains page/line citations for all claims and contradictions
- **Attorney-Ready Reports**: Generates comprehensive markdown/HTML/JSON reports

## Live Demo

Visit the live application: [https://yourusername.github.io/legal-automations/](https://yourusername.github.io/legal-automations/)

(Replace with your actual GitHub username after deployment)

## Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **LLM**: OpenAI GPT-4 (gpt-4o) for claim extraction and contradiction analysis
- **Embeddings**: OpenAI text-embedding-3-large
- **Vector Database**: Chroma Cloud (optional, falls back to local similarity matching)
- **Hosting**: GitHub Pages (static site)

## Setup & Installation

### Prerequisites

- Node.js 20+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- (Optional) Chroma Cloud account for enhanced semantic search

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/legal-automations.git
   cd legal-automations
   ```

2. Install dependencies:
   ```bash
   cd webapp
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### API Key Configuration

When you first open the application:

1. Enter your OpenAI API key (required)
2. (Optional) Enter Chroma Cloud credentials for enhanced semantic search:
   - Tenant ID
   - Database Name
   - API Key

API keys are stored in your browser's local storage and never sent to any server except the respective API providers.

## Usage

1. **Configure API Keys**: Enter your OpenAI API key on first load
2. **Upload Transcript**: Drag and drop or select a PDF/TXT deposition transcript
3. **Wait for Analysis**: The system will:
   - Parse the transcript into Q&A pairs
   - Extract claims from witness testimony
   - Generate embeddings for semantic search
   - Detect contradictions and inconsistencies
   - Generate a comprehensive report
4. **Review Report**: View contradictions with citations and export in multiple formats

### Supported Transcript Formats

- **PDF**: Deposition transcripts with or without line numbers
- **TXT**: Plain text transcripts with Q/A markers

Best results with transcripts that include:
- Clear Q. and A. markers for questions and answers
- Page numbers (e.g., "Page 12")
- Line numbers (e.g., "1  Q. Question text")

## Architecture

### Data Flow

```
1. Upload → Parse PDF/TXT
2. Extract Q/A Utterances
3. Extract Claims from Answers (LLM)
4. Generate Embeddings
5. Store in Vector DB
6. Find Similar Claims (Semantic Search)
7. Detect Contradictions (LLM)
8. Generate Report
```

### Contradiction Types

- **Hard Contradiction**: Mutually exclusive statements
- **Soft Inconsistency**: Hedging or qualification changes
- **Scope Shift**: Scope changes ("never" → "sometimes")
- **Temporal Conflict**: Timeline inconsistencies
- **Definition Drift**: Key term usage changes

## Cost Estimates

OpenAI API costs vary by transcript length:

- Small transcript (50 pages): ~$0.50-$1.00
- Medium transcript (150 pages): ~$2.00-$4.00
- Large transcript (300 pages): ~$5.00-$10.00

Costs depend on:
- Number of witness responses (claims to extract)
- Number of candidate pairs (contradictions to check)
- API rate limits and retry attempts

## Security & Privacy

- All processing happens client-side in your browser
- API keys are stored in browser local storage only
- Transcript data is sent only to OpenAI/Chroma Cloud APIs
- No data is stored on any intermediate servers
- Not recommended for use on shared computers

## Deploying to GitHub Pages

1. Push to the `main` branch
2. Go to your repository Settings → Pages
3. Under "Build and deployment", select "GitHub Actions" as the source
4. GitHub Actions will automatically build and deploy on every push
5. Your app will be available at: `https://yourusername.github.io/legal-automations/`

## Sample Transcript

A sample deposition transcript is included in `webapp/public/sample_deposition.txt` for testing purposes.

## Disclaimer

This tool is for professional legal use only. All analysis should be reviewed by qualified legal professionals. The tool identifies patterns and potential inconsistencies but does not make legal conclusions or replace human judgment.

## License

MIT License - see LICENSE file for details

---

Built with OpenAI GPT-4, React, and TypeScript.
