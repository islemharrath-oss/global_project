# Contributing to MedVision

Guidelines for contributing to the MedVision project.

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/yourusername/medvision.git`
3. **Create** a feature branch: `git checkout -b feature/my-feature`
4. **Make** your changes
5. **Push** to your fork and submit a **Pull Request**

---

## 📋 Code Standards

### Python (Backend)

**Style Guide:** PEP 8

```bash
# Install linting tools
pip install black flake8 isort

# Format code
black backend/

# Check style
flake8 backend/

# Organize imports
isort backend/
```

**File Structure:**
```
api/
├── models.py      # Database models
├── views.py       # API endpoints
├── serializers.py # DRF serializers
├── urls.py        # URL routing
├── admin.py       # Django admin
└── tests.py       # Unit tests
```

**Docstring Format:**
```python
def analyze_xray(request):
    """
    Analyze an X-ray image.
    
    Args:
        request (Request): HTTP request with image file
        
    Returns:
        Response: Analysis results with findings and confidence score
        
    Raises:
        ValidationError: If image is invalid
    """
    pass
```

### JavaScript/React (Frontend)

**Style Guide:** Airbnb JavaScript Style Guide

```bash
# Install ESLint and Prettier
npm install --save-dev eslint prettier eslint-plugin-react

# Format code
npm run format

# Check style
npm run lint
```

**File Structure:**
```
components/
├── ComponentName.js
├── ComponentName.css
├── hooks/           # Custom React hooks
├── utils/          # Utility functions
└── __tests__/      # Component tests
```

**Code Example:**
```javascript
/**
 * Display X-ray analysis report
 * @component
 *
 * @param {Object} props - Component props
 * @param {Object} props.report - Analysis report data
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message
 * @returns {JSX.Element} Report display component
 *
 * @example
 * return (
 *   <ReportDisplay report={data} isLoading={false} error={null} />
 * )
 */
const ReportDisplay = ({ report, isLoading, error }) => {
  // Component code
};
```

---

## 🔄 Git Workflow

### Branch Naming

```
feature/description      # New feature
fix/description         # Bug fix
docs/description        # Documentation
refactor/description    # Code refactoring
test/description        # Tests
chore/description       # Maintenance
```

### Commit Messages

```
feat: Add image upload component
fix: Correct CORS header handling
docs: Update installation guide
refactor: Simplify API error handling
test: Add ReportDisplay tests
chore: Update dependencies
```

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(api): Add file size validation

- Limit upload size to 10MB
- Return descriptive error messages
- Add validation in serializer

Fixes #123
```

---

## 🧪 Testing

### Python Tests

```bash
# Run all tests
python manage.py test

# Run specific test
python manage.py test api.tests.XRayAnalysisViewTest

# With coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

**Test Template:**
```python
from django.test import TestCase
from api.models import XRayAnalysis

class XRayAnalysisTest(TestCase):
    def setUp(self):
        # Setup test data
        self.analysis = XRayAnalysis.objects.create(
            findings="Test findings"
        )
    
    def test_analysis_creation(self):
        self.assertEqual(self.analysis.findings, "Test findings")
    
    def test_str_representation(self):
        self.assertIn(str(self.analysis.id), str(self.analysis))
```

### JavaScript Tests

```bash
# Run tests
npm test

# Coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

**Test Template:**
```javascript
import { render, screen } from '@testing-library/react';
import ReportDisplay from './ReportDisplay';

describe('ReportDisplay', () => {
  test('renders report data', () => {
    const mockReport = { findings: 'Test' };
    render(<ReportDisplay report={mockReport} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  test('shows loading state', () => {
    render(<ReportDisplay isLoading={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

---

## 📝 Pull Request Process

1. **Update** documentation if needed
2. **Add** tests for new features
3. **Ensure** all tests pass: `npm test` & `python manage.py test`
4. **Follow** code style guidelines
5. **Update** CHANGELOG.md
6. **Create** PR with clear description
7. **Link** related issues: `Fixes #123`

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing done

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
```

---

## 🎨 Design Guidelines

### React Components

**Preferred:**
- Functional components with hooks
- Composition over inheritance
- Single responsibility principle

**Props:**
```javascript
// ✅ Good
<Button onClick={handleClick} disabled={isLoading} />

// ❌ Avoid
<Button buttonConfig={{ onClick, disabled }} />
```

**State Management:**
```javascript
// ✅ Use useState for local state
const [isLoading, setIsLoading] = useState(false);

// ❌ Avoid prop drilling
// Instead use Context API or state library
```

### Django Models

**Standards:**
- Add docstrings
- Use descriptive field names
- Include help_text
- Set verbose_name for admin

```python
class XRayAnalysis(models.Model):
    """X-ray image analysis with findings and recommendations."""
    
    image = models.ImageField(
        upload_to='xrays/',
        help_text="Original X-ray image file"
    )
    
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="AI model confidence (0-100)"
    )
```

---

## 🔍 Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No hardcoded values or secrets
- [ ] Error handling is appropriate
- [ ] Performance is acceptable
- [ ] Accessibility considered
- [ ] No breaking changes

---

## 📚 Documentation

### README Updates
- Add new features to feature list
- Update setup instructions if needed
- Document new API endpoints

### Code Comments
```python
# ✅ Good
# Validate file size before processing
if file.size > MAX_SIZE:
    raise ValidationError("File too large")

# ❌ Avoid
# Check if file is big
if file.size > 10000000:
    pass
```

---

## 🚀 Development Tools

### Recommended IDE Extensions

**VS Code:**
- Python
- Pylance
- ESLint
- Prettier
- Thunder Client / REST Client

**Settings:**
```json
{
  "python.linting.enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Local Development Tips

```bash
# Run both servers with one command
# Terminal 1: Backend
cd backend
.venv/bin/python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Test runner
cd frontend
npm test
```

---

## 📋 Reporting Issues

### Bug Report Template
```markdown
## Describe the bug
Clear description of issue

## Steps to reproduce
1. ...
2. ...
3. ...

## Expected behavior
What should happen

## Actual behavior
What actually happens

## Environment
- OS: [e.g., Windows, macOS]
- Python: [version]
- Node: [version]
- Browser: [if applicable]

## Screenshots
If applicable
```

### Feature Request Template
```markdown
## Description
Clear description of desired feature

## Use Case
Why is this feature needed

## Proposed Solution
How to implement

## Alternatives
Other possible approaches
```

---

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🤝 Community

- 💬 Discussions: GitHub Discussions
- 🐛 Issues: GitHub Issues
- 📧 Email: maintainers@example.com

Thank you for contributing to MedVision! 🎉

---

**Last Updated:** January 2024
