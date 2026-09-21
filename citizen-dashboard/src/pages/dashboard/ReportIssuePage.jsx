import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLAINT_TYPES, PRIORITY_LEVELS } from '../../constants/app';
import service from '../../services';
import { validateImage } from '../../utils/imageValidation';
import { compressImage } from '../../utils/imageCompression';
import { readImageLocation } from '../../utils/imageLocation';
import { SEVERITY_META } from '../../shared/constants';
import ComplaintLocationMap from '../../shared/components/ComplaintLocationMap';

const initialForm = {
  title: '',
  type: COMPLAINT_TYPES[0],
  priority: PRIORITY_LEVELS[1],
  address: '',
  landmark: '',
  description: '',
  location: '12.9716, 77.5946',
};

const MAX_PHOTOS_PER_REQUEST = 5;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to prepare the uploaded image.'));
  reader.readAsDataURL(file);
});

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

const parseLocation = (value) => {
  const [lat, lng] = String(value || '').split(',').map(Number);
  return {
    lat: Number.isFinite(lat) ? lat : 12.9716,
    lng: Number.isFinite(lng) ? lng : 77.5946,
  };
};

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const isPhone = typeof navigator !== 'undefined' && /Android|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [previewUrls, setPreviewUrls] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [compressionMeta, setCompressionMeta] = useState(null);
  const [photoLocations, setPhotoLocations] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisState, setAnalysisState] = useState('idle');
  const [showReview, setShowReview] = useState(false);

  useEffect(() => () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  const severityMeta = useMemo(
    () => (analysisResult ? SEVERITY_META[analysisResult.severity] || SEVERITY_META.medium : null),
    [analysisResult],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetImage = () => {
    setSelectedFiles([]);
    setAnalysisResult(null);
    setCompressionMeta(null);
    setPhotoLocations([]);
    setAnalysisState('idle');
    setStatusMessage('');
    setError('');
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
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
    const newFiles = Array.from(event.target?.files || []);
    if (!newFiles.length) return;

    if (source === 'gallery' && galleryRef.current) galleryRef.current.value = '';
    if (source === 'camera' && cameraRef.current) cameraRef.current.value = '';

    try {
      setError('');
      setAnalysisState('validating');
      const files = [...selectedFiles, ...newFiles];
      if (files.length > MAX_PHOTOS_PER_REQUEST) {
        throw new Error(`You can upload a maximum of ${MAX_PHOTOS_PER_REQUEST} photos per request.`);
      }
      setStatusMessage(`Validating ${files.length} photo${files.length === 1 ? '' : 's'}...`);
      const validatedFiles = await Promise.all(files.map((file) => validateImage(file)));
      const detectedLocations = await Promise.all(validatedFiles.map((validated) => readImageLocation(validated.file)));
      setPhotoLocations(detectedLocations);
      const firstLocation = detectedLocations[0];
      if (firstLocation) {
        setForm((current) => ({
          ...current,
          location: firstLocation.coordinates,
          address: firstLocation.address || current.address,
        }));
      }
      setAnalysisState('compressing');
      setStatusMessage(`Preparing ${files.length} photo${files.length === 1 ? '' : 's'}...`);
      const compressedFiles = [];
      let originalSize = 0;
      let compressedSize = 0;
      let wasCompressed = false;

      for (const validated of validatedFiles) {
        const compressed = await compressImage(validated.file, 4 * 1024 * 1024);
        compressedFiles.push(compressed.file);
        originalSize += compressed.originalSize;
        compressedSize += compressed.compressedSize;
        wasCompressed ||= compressed.wasCompressed;
      }

      setCompressionMeta({ originalSize, compressedSize, wasCompressed });
      setSelectedFiles(compressedFiles);
      setStatusMessage(`${compressedFiles.length} photo${compressedFiles.length === 1 ? '' : 's'} ready. Analyzing the first photo...`);

      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls(compressedFiles.map((file) => URL.createObjectURL(file)));
      setAnalysisState('analyzing');
      await runAnalysis(compressedFiles[0], false);
    } catch (err) {
      setAnalysisState('error');
      setError(err?.message || 'Unable to upload the selected image.');
      setStatusMessage(err?.message || 'Unable to upload the selected image.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedFiles.length || analysisState !== 'ready') {
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
          photoBefore: await fileToDataUrl(selectedFiles[0]),
          photos: await Promise.all(selectedFiles.map((file) => fileToDataUrl(file))),
          photoLocations,
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
              {isPhone ? (
                <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200">
                  <span>Take Photo</span>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleImageSelection(event, 'camera')} />
                </label>
              ) : null}
              <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200">
                <span>Choose from Gallery</span>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleImageSelection(event, 'gallery')} />
              </label>
            </div>
          </div>

          {previewUrls.length ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-3">
                {previewUrls.map((url, index) => (
                  <div key={url} className="relative">
                    <img src={url} alt={`Selected issue ${index + 1}`} className="h-20 w-20 rounded-xl object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">{index + 1}</span>
                  </div>
                ))}
                <p className="text-sm font-semibold text-slate-800">{selectedFiles.length} / {MAX_PHOTOS_PER_REQUEST} photos</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{selectedFiles.map((file) => file.name).join(', ')} · {analysisState}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={resetImage} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Remove</button>
                  <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-200">
                    <span>Add more photos</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleImageSelection(event, 'gallery')} />
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
              <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                photoLocations.some(Boolean)
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}>
                {photoLocations.some(Boolean) ? (
                  <div className="space-y-1">
                    <span className="font-semibold">Photo locations detected:</span>
                    {photoLocations.map((location, index) => (
                      <div key={`${location?.coordinates || 'none'}-${index}`}>
                        Photo {index + 1}: {location ? `${location.address || location.coordinates} (${location.coordinates})` : 'No GPS location found'}
                      </div>
                    ))}
                  </div>
                ) : 'No GPS location found in these photos. Please enter the address manually.'}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No images selected yet. You can add up to {MAX_PHOTOS_PER_REQUEST} photos.
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

            {analysisResult.code !== 'no_problem_found' && analysisResult.code !== 'not_road_issue' ? (
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
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Analyzer</p>
                <p className="mt-2 font-semibold uppercase text-slate-900">{analysisResult.analyzer || 'AI'}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pothole detected</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {typeof analysisResult.pothole_detected === 'boolean'
                    ? (analysisResult.pothole_detected ? 'Yes' : 'No')
                    : 'Not reported'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Waterlogging detected</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {typeof analysisResult.waterlogging_detected === 'boolean'
                    ? (analysisResult.waterlogging_detected ? 'Yes' : 'No')
                    : 'Not reported'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Severity</p>
                <p className="mt-2 font-semibold capitalize text-slate-900">{analysisResult.severity || 'Not available'}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidence</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {typeof analysisResult.confidence === 'number' ? `${Math.round(analysisResult.confidence * 100)}%` : 'Not available'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Affected image area</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {typeof analysisResult.affected_area_ratio === 'number'
                    ? `${Math.round(analysisResult.affected_area_ratio * 100)}%`
                    : 'Not available'}
                </p>
              </div>
            </div>

            {analysisResult.message ? (
              <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700">
                {analysisResult.message}
              </div>
            ) : null}

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
            onClick={() => selectedFiles[0] && runAnalysis(selectedFiles[0], true)}
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
              <div className="sm:col-span-2 overflow-hidden rounded-xl bg-white p-3">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Report location</p>
                <ComplaintLocationMap
                  {...parseLocation(form.location)}
                  address={form.address || form.landmark || 'Selected report location'}
                  locations={photoLocations}
                />
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
