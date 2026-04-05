# Frontend Documentation

React frontend for MedVision medical X-ray analysis platform.

## 📋 Overview

Modern React application with Material-UI components for X-ray image analysis.

## 🏗️ Project Structure

```
frontend/
├── public/                  # Static assets (served as-is)
│   ├── index.html          # HTML entry point
│   ├── manifest.json       # PWA manifest
│   └── robots.txt          # SEO configuration
│
├── src/                    # Source code
│   ├── components/         # Reusable React components
│   │   ├── AnalyzeButton.js    # Analysis trigger button
│   │   ├── Header.js           # Navigation header
│   │   ├── HistoryPanel.js     # Analysis history display
│   │   ├── ImageUploader.js    # Image upload component
│   │   ├── ReportDisplay.js    # Analysis results display
│   │   └── XAIViewer.js        # XAI heatmap viewer
│   │
│   ├── api.js              # API client with error handling
│   ├── App.js              # Root component
│   ├── index.js            # React entry point
│   ├── App.css             # Global styles
│   ├── index.css           # Base styles
│   └── App.test.js         # Component tests
│
├── package.json            # Node dependencies and scripts
├── .env.example           # Environment variables template
├── README.md              # This file
└── .gitignore             # Git ignore patterns
```

## 📚 Available Scripts

### `npm start`
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it.
Page auto-reloads when you save changes. Check console for lint errors.

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.
Bundles React optimized for best performance. Minified with hashed filenames.

### `npm run eject`
⚠️ **One-way operation.** Exposes all configuration files. Only use if needed.

## 🔧 Development

### Setup
```bash
npm install
npm start
```

### Code Style
- 2-space indentation
- Folder structure: Component.js + Component.css
- Use functional components with hooks
- Prefer composition over inheritance

### Component Template
```javascript
import './MyComponent.css';

const MyComponent = ({ prop1, prop2 }) => {
  return (
    <div className="my-component">
      Content here
    </div>
  );
};

export default MyComponent;
```

## 🧪 Testing

```bash
npm test
npm test -- --coverage
```

## 🚀 Production Build

```bash
npm run build
```

Creates optimized `build/` directory ready for deployment.

## 📦 Dependencies

- **React 19** - UI framework
- **Material-UI 7** - Component library
- **React Router 7** - Routing

See [package.json](package.json) for full list.

## 🔐 Security

- Never hardcode API endpoints: use `.env` files
- Run `npm audit` regularly
- Keep dependencies updated: `npm update`

## 📚 Resources

- [React Docs](https://react.dev)
- [Material-UI Docs](https://mui.com/)
- [Testing Library](https://testing-library.com/)

---

**Last Updated:** January 2024

