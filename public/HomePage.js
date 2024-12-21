// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Global variables
let resumeContent = '';
let targetRole = '';
let experienceLevel = '';
let GEMINI_API_KEY = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch API key
    const response = await fetch('/api/key');
    const data = await response.json();
    GEMINI_API_KEY = data.apiKey;

    // Get DOM elements
    const uploadBox = document.getElementById('uploadBox');
    const resumeInput = document.getElementById('resumeInput');
    const roleSelect = document.getElementById('roleSelect');
    const experienceSelect = document.getElementById('experienceSelect');
    const continueBtn = document.getElementById('continueBtn');
    const startOverBtn = document.getElementById('startOverBtn');

    // Role selection handlers
    roleSelect.addEventListener('change', checkSelections);
    experienceSelect.addEventListener('change', checkSelections);
    continueBtn.addEventListener('click', handleContinue);

    // File upload handlers
    uploadBox.addEventListener('click', () => resumeInput.click());
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);
    resumeInput.addEventListener('change', handleFileSelect);

    // Start over handler
    startOverBtn.addEventListener('click', () => location.reload());
});

// Selection handlers
function checkSelections() {
    const roleSelect = document.getElementById('roleSelect');
    const experienceSelect = document.getElementById('experienceSelect');
    const continueBtn = document.getElementById('continueBtn');
    
    if (roleSelect.value && experienceSelect.value) {
        continueBtn.classList.add('active');
    } else {
        continueBtn.classList.remove('active');
    }
}

function handleContinue() {
    const roleSelect = document.getElementById('roleSelect');
    const experienceSelect = document.getElementById('experienceSelect');
    
    if (roleSelect.value && experienceSelect.value) {
        targetRole = roleSelect.value;
        experienceLevel = experienceSelect.value;
        document.getElementById('roleSection').style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
    } else {
        alert('Please select both role and experience level');
    }
}

// File handlers
function handleDragOver(e) {
    e.preventDefault();
    this.style.borderColor = '#4CAF50';
}

function handleDragLeave() {
    this.style.borderColor = 'rgba(255, 255, 255, 0.5)';
}

async function handleDrop(e) {
    e.preventDefault();
    this.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    const file = e.dataTransfer.files[0];
    await handleFile(file);
}

async function handleFileSelect(e) {
    const file = e.target.files[0];
    await handleFile(file);
}

async function handleFile(file) {
    if (!file) return;
    
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        .includes(file.type)) {
        alert('Please upload a PDF or DOCX file');
        return;
    }

    try {
        // Hide upload section and show analysis section
        document.querySelector('.upload-section').style.display = 'none';
        document.getElementById('analysisSection').style.display = 'block';
        updateStatus('Extracting text from document...');

        // Extract text
        resumeContent = await extractTextFromFile(file);
        updateStatus('Analyzing content...');
        
        // Analyze resume
        const analysis = await analyzeResume(resumeContent);
        updateStatus('Generating results...');
        
        // Show results section
        document.getElementById('analysisSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        
        // Display results immediately
        displayResults(analysis);

    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please try again.');
        document.querySelector('.upload-section').style.display = 'block';
        document.getElementById('analysisSection').style.display = 'none';
    }
}

// Text extraction
async function extractTextFromFile(file) {
    try {
        if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
            
            return text.trim();
        } else {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value.trim();
        }
    } catch (error) {
        console.error('Error extracting text:', error);
        throw new Error('Failed to extract text from file');
    }
}

// Analysis
async function analyzeResume(text) {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    const MAX_RETRIES = 5;
    const INITIAL_RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this resume for a ${targetRole} position at ${experienceLevel} level and provide feedback in JSON format:
                            {
                                "ats_score": "Score out of 100",
                                "formatting": ["formatting feedback"],
                                "missing_keywords": ["missing keywords"],
                                "key_findings": ["key findings"],
                                "improvement_suggestions": ["improvement suggestions"]
                            }
                            Resume: ${text}`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                if (response.status === 429 && attempt < MAX_RETRIES) {
                    const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
                    console.warn(`Rate limit exceeded. Retrying in ${retryDelay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                throw new Error('API request failed');
            }

            const data = await response.json();
            const responseText = data.candidates[0].content.parts[0].text;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('Invalid API response format');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            if (attempt === MAX_RETRIES) {
                console.error('Analysis error:', error);
                throw new Error('Resume analysis failed');
            }
        }
    }
}

// UI updates
function updateStatus(message) {
    const statusElement = document.querySelector('.analysis-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function displayResults(analysis) {
    try {
        const resultsSection = document.querySelector('.results-grid');
        document.querySelector('.target-role').textContent = 
            `Analysis for ${experienceLevel} ${targetRole} Position`;
        
        // Convert score to number
        const score = parseInt(analysis.ats_score);
        
        // Determine score color and label
        let scoreColor, scoreLabel, scoreDescription;
        if (score >= 90) {
            scoreColor = '#4CAF50';
            scoreLabel = 'Excellent!';
            scoreDescription = 'Your resume is highly optimized for ATS systems. Great job!';
        } else if (score >= 75) {
            scoreColor = '#2196F3';
            scoreLabel = 'Very Good';
            scoreDescription = 'Your resume performs well with ATS systems but has room for minor improvements.';
        } else if (score >= 60) {
            scoreColor = '#FF9800';
            scoreLabel = 'Average';
            scoreDescription = 'Your resume needs some optimization to perform better with ATS systems.';
        } else {
            scoreColor = '#f44336';
            scoreLabel = 'Needs Improvement';
            scoreDescription = 'Your resume requires significant improvements to pass ATS systems effectively.';
        }

        // Update CSS variables
        document.documentElement.style.setProperty('--score-color', scoreColor);
        document.documentElement.style.setProperty('--progress', `${score * 3.6}deg`);

        // Create results HTML
        resultsSection.innerHTML = `
            <div class="score-container">
                <div class="score-circle">
                    <span class="score">${score}</span>
                </div>
                <div class="score-label" style="color: ${scoreColor}">${scoreLabel}</div>
                <div class="score-description">${scoreDescription}</div>
            </div>
            <div class="result-card">
                <h3>📋 Formatting Issues</h3>
                <div class="content">
                    <ul>${analysis.formatting.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            </div>
            <div class="result-card">
                <h3>🎯 Missing Keywords</h3>
                <div class="content">
                    <ul>${analysis.missing_keywords.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            </div>
            <div class="result-card">
                <h3>🔍 Key Findings</h3>
                <div class="content">
                    <ul>${analysis.key_findings.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            </div>
            <div class="result-card">
                <h3>💡 Improvement Suggestions</h3>
                <div class="content">
                    <ul>${analysis.improvement_suggestions.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error displaying results:', error);
        alert('Error displaying results. Please try again.');
    }
}