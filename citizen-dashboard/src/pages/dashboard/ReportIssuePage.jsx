import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLAINT_TYPES, PRIORITY_LEVELS } from '../../constants/app';
import service from '../../services';
import { validateImage } from '../../utils/imageValidation';
import { compressImage } from '../../utils/imageCompression';
import { SEVERITY_META } from '../../shared/constants';

const initialForm = {
  title: '',
  type: COMPLAINT_TYPES[0],
  priority: PRIORITY_LEVELS[1],
  address: '',
  landmark: '',
  description: '',
  location: '12.9716, 77.5946',
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const getSeverityTone = (severity = '') => {
  const label = String(severity).toLowerCase();

  if (label === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (label === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

const getAnalysisBadge = (code) => {
  if (code === 'not_road_issue') return 'Invalid Report';
  if (code === 'no_problem_found') return 'No issue detected';
  if (code === 'possibly_ai_generated') return 'AI-assisted check';
  return 'Analysis ready';
};

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [compressionMeta, setCompressionMeta] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisState, setAnalysisState] = useState('idle');
  const [showReview, setShowReview] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const severityMeta = useMemo(
    () => (analysisResult ? SEVERITY_META[analysisResult.severity] || SEVERITY_META.medium : null),
    [analysisResult],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetImage = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setCompressionMeta(null);
    setAnalysisState('idle');
    setStatusMessage('');
    setError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const runAnalysis = async (file, allowRetry = false) => {
    setError('');
    setAnalysisState('analyzing');
    setStatusMessage(allowRetry ? 'Retrying analysis...' : 'Analyzing image...');

    try {
      const response = await service.analyzeComplaint(file);
      const nextResult = response?.analysis || response || {};

      if (nextResult.code === 'no_problem_found' || nextResult.code === 'not_road_issue') {
        setAnalysisResult({
          code: nextResult.code,
          message: nextResult.message || nextResult.description || 'The uploaded image did not pass validation.',
          severity: 'medium',
          authenticity: 'unverified',
        });
        setAnalysisState('blocked');
        setStatusMessage(nextResult.message || 'The image was reviewed but no valid issue was detected.');
        return;
      }

      setAnalysisResult({
        ...nextResult,
        issue_type: nextResult.issue_type || 'Road Pothole',
        severity: nextResult.severity || 'medium',
        authenticity: nextResult.authenticity || 'unverified',
        confidence: typeof nextResult.confidence === 'number' ? nextResult.confidence : undefined,
      });
      setAnalysisState('ready');
      setForm((current) => ({ ...current, type: nextResult.issue_type || current.type, description: nextResult.description || current.description }));
      setStatusMessage('Image analysis complete.');
    } catch (err) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message || err?.message || 'Unable to analyze this image.';

      if (code === 'no_problem_found' || code === 'not_road_issue') {
        setAnalysisResult({
          code,
          message,
          severity: 'medium',
          authenticity: 'unverified',
        });
        setAnalysisState('blocked');
        setStatusMessage(message);
        return;
      }

      setAnalysisState('analysis_failed');
      setStatusMessage(message);
      setError('Analysis failed. Please retry with the same image.');
    }
  };

  const handleImageSelection = async (event, source) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (source === 'gallery' && galleryRef.current) galleryRef.current.value = '';
    if (source === 'camera' && cameraRef.current) cameraRef.current.value = '';

    try {
      setError('');
      setAnalysisState('validating');
      setStatusMessage('Validating image...');
      const validated = await validateImage(file);
      let finalFile = validated.file;
      let meta = null;

      if (finalFile.size > 4 * 1024 * 1024) {
        setAnalysisState('compressing');
        setStatusMessage('Compressing image...');
        const compressed = await compressImage(finalFile, 4 * 1024 * 1024);
        finalFile = compressed.file;
        meta = {
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
          wasCompressed: compressed.wasCompressed,
        };
        setCompressionMeta(meta);
        setStatusMessage(`Compressed from ${formatBytes(meta.originalSize)} to ${formatBytes(meta.compressedSize)}.`);
      } else {
        setCompressionMeta({
          originalSize: finalFile.size,
          compressedSize: finalFile.size,
          wasCompressed: false,
        });
      }

      setSelectedFile(finalFile);
      setStatusMessage('Image ready. Analyzing now...');

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(finalFile));
      setAnalysisState('analyzing');
      await runAnalysis(finalFile, false);
    } catch (err) {
      setAnalysisState('error');
      setError(err?.message || 'Unable to upload the selected image.');
      setStatusMessage(err?.message || 'Unable to upload the selected image.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedFile || analysisState !== 'ready') {
      setError('Please upload and validate a road issue image before submitting.');
      return;
    }

    if (showReview) {
      setLoading(true);

      try {
        const payload = {
          ...form,
          location: form.location || '12.9716, 77.5946',
          landmark: form.landmark || '',
          description: form.description || analysisResult?.description || form.title,
          citizen_description: form.description || analysisResult?.description || form.title,
          photoBefore: previewUrl,
        };

        const created = await service.createComplaint(payload);
        const confirmed = created?.id
          ? await service.confirmComplaint(created.id, {
              location: payload.location,
              landmark: payload.landmark,
              description: payload.description,
              citizen_description: payload.citizen_description,
            }).catch(() => created)
          : created;

        navigate('/my-complaints', { state: { lastSubmitted: confirmed } });
      } catch (err) {
        setError(err?.message || 'Unable to submit complaint.');
      } finally {
        setLoading(false);
      }

      return;
    }

    setShowReview(true);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Citizen service</p>
        <h2 className="text-2xl font-bold text-slate-900">Report an issue</h2>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Image upload</p>
              <p className="text-xs text-slate-500">Max 4 MB (larger images are compressed automatically)</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200">
                <span>Take Photo</span>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleImageSelection(event, 'camera')} />
              </label>
              <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200">
                <span>Choose from Gallery</span>
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageSelection(event, 'gallery')} />
              </label>
            </div>
          </div>

          {previewUrl ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <img src={previewUrl} alt="Selected issue preview" className="h-20 w-20 rounded-xl object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selectedFile?.name || 'Uploaded image'}</p>
                    <p className="text-xs text-slate-500">{selectedFile ? `${formatBytes(selectedFile.size)} • ${analysisState}` : 'No file selected'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={resetImage} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Remove</button>
                  <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200">
                    <span>Replace</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageSelection(event, 'gallery')} />
                  </label>
                </div>
              </div>

              {compressionMeta ? (
                <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                  {compressionMeta.wasCompressed
                    ? `Compressed from ${formatBytes(compressionMeta.originalSize)} to ${formatBytes(compressionMeta.compressedSize)}`
                    : 'Image is within the safe upload size and was not re-encoded.'}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No image selected yet.
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="title">
              Short title
            </label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Broken drainage near market road"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="type">
              Issue type
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              {COMPLAINT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              {PRIORITY_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="address">
              Exact address
            </label>
            <input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Near Metro Station, 3rd Cross Road"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="landmark">
              Landmark or nearby reference
            </label>
            <input
              id="landmark"
              name="landmark"
              value={form.landmark}
              onChange={handleChange}
              placeholder="Opposite City Hospital gate, next to bus shelter"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="5"
              placeholder="Please explain the problem, risk, and nearby landmarks."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </div>
        </div>

        {analysisResult ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AI estimate</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{getAnalysisBadge(analysisResult.code)}</p>
              </div>
              {analysisResult.code === 'valid' ? (
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityTone(analysisResult.severity)}`}>
                  {analysisResult.severity || 'Medium'}
                </span>
              ) : null}
            </div>

            {analysisResult.code === 'valid' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issue</p>
                  <p className="mt-2 font-semibold text-slate-900">{analysisResult.issue_type}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Severity</p>
                  <p className="mt-2 font-semibold text-slate-900">{analysisResult.severity}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Accident risk</p>
                  <p className="mt-2 font-semibold text-slate-900">{analysisResult.accident_risk}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidence</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {typeof analysisResult.confidence === 'number' ? `${Math.round(analysisResult.confidence * 100)}%` : 'N/A'}
                  </p>
                </div>
                <div className="sm:col-span-2 rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
                  <p className="mt-2 font-semibold text-slate-900">{analysisResult.department || 'Road / PWD Department'}</p>
                </div>
                <div className="sm:col-span-2 rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI description</p>
                  <p className="mt-2 text-sm text-slate-700">{analysisResult.description}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700">
                {analysisResult.message}
              </div>
            )}

            {analysisResult.authenticity && analysisResult.authenticity !== 'unverified' ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This image may be AI-generated. This is an AI-assisted check, not a certainty.
              </div>
            ) : null}
          </div>
        ) : null}

        {statusMessage ? (
          <div aria-live="polite" className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {analysisState === 'analysis_failed' ? (
          <button
            type="button"
            onClick={() => selectedFile && runAnalysis(selectedFile, true)}
            className="rounded-xl border border-cyan-700 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
          >
            Retry
          </button>
        ) : null}

        {showReview ? (
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Review</p>
                <p className="mt-1 text-lg font-bold text-slate-900">Confirm this report before submission</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Edit details
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issue</p>
                <p className="mt-2 font-semibold text-slate-900">{form.title || 'Untitled report'}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Type</p>
                <p className="mt-2 font-semibold text-slate-900">{form.type}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Landmark</p>
                <p className="mt-2 font-semibold text-slate-900">{form.landmark || 'Not provided'}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</p>
                <p className="mt-2 font-semibold text-slate-900">{form.priority}</p>
              </div>
              <div className="sm:col-span-2 rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Address</p>
                <p className="mt-2 font-semibold text-slate-900">{form.address}</p>
              </div>
              <div className="sm:col-span-2 rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Description</p>
                <p className="mt-2 text-sm text-slate-700">{form.description}</p>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || analysisState !== 'ready'}
          className="rounded-xl bg-cyan-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-cyan-400"
        >
          {loading ? 'Submitting...' : showReview ? 'Confirm & submit' : 'Submit complaint'}
        </button>
      </form>
    </div>
  );
}
