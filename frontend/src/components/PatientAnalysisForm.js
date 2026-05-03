import React, { useCallback, useState } from 'react';
import { analyzeXray } from '../api';
import ImageUploader from './ImageUploader';
import AnalyzeButton from './AnalyzeButton';
import './PatientAnalysisForm.css';

function PatientAnalysisForm({ patientId, onReportGenerated, onAnalysisStateChange }) {
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageSelect = useCallback((file) => {
    setImageFile(file);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile || !patientId) {
      setError('Missing image or patient');
      return;
    }

    setIsLoading(true);
    setError(null);
    if (onAnalysisStateChange) {
      onAnalysisStateChange(true);
    }

    try {
      const data = await analyzeXray(imageFile, patientId);
      onReportGenerated(data);
    } catch (err) {
      console.error('Analyze error:', err);
      setError(err.message || "Error during analysis");
    } finally {
      setIsLoading(false);
      if (onAnalysisStateChange) {
        onAnalysisStateChange(false);
      }
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setError(null);
  };

  return (
    <div className="patient-analysis-form">
      <ImageUploader
        onImageSelect={handleImageSelect}
        isLoading={isLoading}
      />

      <AnalyzeButton
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
        hasImage={!!imageFile}
      />

      {error && (
        <div className="analysis-error">
          <span>❌ {error}</span>
          <button onClick={handleClear}>Clear and retry</button>
        </div>
      )}
    </div>
  );
}

export default PatientAnalysisForm;