import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MEETING_API, SUMMARY_API } from '../api/axios';
import { formatDate, formatDuration, getStatusColor, formatStatusLabel } from '../utils/helpers';
import {
  ArrowLeft,
  Loader2,
  Clock,
  Calendar,
  Users,
  FileText,
  Mic,
  Trash2,
  Edit,
  MessageSquare,
  Sparkles,
  LogIn,
  Copy,
  Check,
  KeyRound,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';

const BG_GRADIENT = 'linear-gradient(135deg, #0f0c29 0%, #1a1560 30%, #1e3a5f 60%, #0d2137 100%)';
const GLASS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)' };

function PageShell({ children }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: BG_GRADIENT }} />
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-32 right-16 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">{children}</div>
    </div>
  );
}

function CopyChip({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available — ignore silently
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors group"
    >
      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
      <span className="text-xs font-bold text-white uppercase tracking-wide">{label}:</span>
      <span className="text-xs font-mono text-indigo-100">{value}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-indigo-200/60 group-hover:text-white transition-colors" />
      )}
    </button>
  );
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [exportedFiles, setExportedFiles] = useState(null);
  const [exportedFilesLoading, setExportedFilesLoading] = useState(false);
  const [exportedFilesError, setExportedFilesError] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchMeetingData();
  }, [id]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [meetingRes, summaryRes] = await Promise.all([
        MEETING_API.getById(id),
        SUMMARY_API.getByMeeting(id),
      ]);
      const meetingData = meetingRes.data?.data?.meeting || meetingRes.data?.meeting || meetingRes.data;
      setMeeting(meetingData);
      setSummaries(summaryRes.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAudio(true);
      await SUMMARY_API.uploadAudio(id, file);
      await fetchMeetingData();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Audio upload failed');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setGeneratingSummary(true);
      await SUMMARY_API.generate(id);
      await fetchMeetingData();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Summary generation failed');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await MEETING_API.delete(id);
      navigate('/meetings');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete meeting');
    }
  };

  const handleLoadExportedFiles = async () => {
    try {
      setExportedFilesLoading(true);
      setExportedFilesError(null);
      const res = await MEETING_API.getExportedFiles(id);
      const data = res.data?.data || res.data;
      setExportedFiles(data);
    } catch (err) {
      setExportedFilesError(
        err.response?.data?.message || err.response?.data?.detail || 'Failed to load exported files'
      );
    } finally {
      setExportedFilesLoading(false);
    }
  };

  const isCompleted = meeting?.status === 'completed';

  const tabs = useMemo(() => {
    const base = [{ id: 'details', label: 'Details', icon: FileText }];
    if (isCompleted) {
      base.push(
        { id: 'summaries', label: 'Summaries', icon: MessageSquare }
      );
    }
    return base;
  }, [isCompleted]);

  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab('details');
    }
  }, [tabs, activeTab]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-300" />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchMeetingData}
            className="px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105"
            style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  if (!meeting) {
    return (
      <PageShell>
        <div className="text-center py-20">
          <p className="text-indigo-200/70">Meeting not found</p>
          <Link to="/meetings" className="text-indigo-300 hover:text-indigo-200 mt-2 inline-block">
            Back to meetings
          </Link>
        </div>
      </PageShell>
    );
  }

  const infoItems = [
    {
      icon: Calendar,
      gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
      label: 'Date',
      value: formatDate(meeting.scheduled_at || meeting.created_at),
    },
    {
      icon: Clock,
      gradient: 'linear-gradient(135deg,#059669,#0d9488)',
      label: 'Duration',
      value: formatDuration(meeting.duration_minutes),
    },
    {
      icon: Users,
      gradient: 'linear-gradient(135deg,#a855f7,#d946ef)',
      label: 'Participants',
      value: meeting.participant_count || 0,
    },
  ];

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/meetings')}
            className="p-2.5 rounded-2xl border border-white/15 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              Meeting Details
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{meeting.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
            <button
              onClick={() => navigate(`/meetings/${id}/room`)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-2xl text-white shadow-lg transition-all hover:scale-105"
              style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
            >
              <LogIn className="w-4 h-4" />
              Join
            </button>
          )}
          <button
            onClick={() => navigate(`/meetings/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-2xl border border-white/15 text-white hover:bg-white/10 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-2xl border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {meeting.meeting_code && (
        <div className="flex flex-wrap items-center gap-3">
          <CopyChip label="Meeting Code" value={meeting.meeting_code} />
          <CopyChip label="Meeting ID" value={meeting.id} />
        </div>
      )}

      {/* Meeting Info Card */}
      <div className="rounded-3xl border border-white/10 shadow-xl p-6 sm:p-8" style={GLASS}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className="p-3 rounded-2xl shadow-lg shrink-0"
                style={{ background: item.gradient }}
              >
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-indigo-200/60">{item.label}</p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl shadow-lg shrink-0" style={{ background: 'linear-gradient(135deg,#f97316,#f59e0b)' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-indigo-200/60">Status</p>
              <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(meeting.status)}`}>
                {formatStatusLabel(meeting.status)}
              </span>
            </div>
          </div>
        </div>
        {meeting.description && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-indigo-100/80 whitespace-pre-wrap leading-relaxed">
              {meeting.description}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-white/10 p-1.5 inline-flex gap-1 shadow-xl" style={GLASS}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'text-white shadow-lg'
                : 'text-indigo-200/60 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === tab.id ? { background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' } : undefined}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {!isCompleted && (
        <p className="text-xs text-indigo-200/50 -mt-4">
          AI summaries will appear here once this meeting is completed.
        </p>
      )}

      {/* Tab Content */}
      <div className="rounded-3xl border border-white/10 shadow-xl p-6 sm:p-8" style={GLASS}>
        {activeTab === 'details' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Additional Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs text-indigo-200/60">Meeting Code</p>
                <p className="text-sm font-mono text-white mt-0.5">{meeting.meeting_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-200/60">Meeting ID</p>
                <p className="text-sm font-mono text-white mt-0.5">{meeting.id}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-200/60">Meeting Link</p>
                <p className="text-sm text-indigo-300 truncate mt-0.5">{meeting.meeting_link || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-200/60">Last Updated</p>
                <p className="text-sm text-white mt-0.5">
                  {formatDate(meeting.updated_at, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {isCompleted && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-indigo-200/60 uppercase tracking-wide flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Exported Files (uploads/&lt;username&gt;)
                  </p>
                  <button
                    onClick={handleLoadExportedFiles}
                    disabled={exportedFilesLoading}
                    className="text-xs font-bold text-indigo-300 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {exportedFilesLoading ? 'Loading...' : 'Load from disk'}
                  </button>
                </div>

                {exportedFilesError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-400/20">
                    <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{exportedFilesError}</p>
                  </div>
                )}

                {exportedFiles && !exportedFilesError && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-indigo-200/50 uppercase tracking-wide">Summary File</p>
                      <p className="text-xs font-mono text-indigo-200 truncate mt-0.5">
                        {exportedFiles.summary_file || 'Not exported yet'}
                      </p>
                    </div>
                    {exportedFiles.summary && (
                      <details className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <summary className="text-xs font-bold text-indigo-200/70 cursor-pointer">
                          summary.txt contents
                        </summary>
                        <p className="text-xs text-indigo-100/70 whitespace-pre-wrap mt-2">
                          {exportedFiles.summary}
                        </p>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summaries' && isCompleted && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">AI Summaries</h3>
              <div className="flex items-center gap-2">
                <label
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-2xl text-white shadow-lg transition-all hover:scale-105 cursor-pointer"
                  style={{ background: 'linear-gradient(90deg,#059669,#0d9488)' }}
                >
                  {uploadingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading Audio...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Upload Audio Recording
                    </>
                  )}
                  <input
                    type="file"
                    accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-2xl text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
                >
                  {generatingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Generate Summary
                    </>
                  )}
                </button>
              </div>
            </div>
            {summaries.length === 0 ? (
              <p className="text-indigo-200/60 text-center py-10">
                No summaries generated yet. Upload meeting audio or generate an AI summary directly.
              </p>
            ) : (
              <div className="space-y-3">
                {summaries.map((summary) => (
                  <div key={summary.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        {formatDate(summary.created_at, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(summary.status === 'generating' ? 'in_progress' : summary.status)}`}>
                        {formatStatusLabel(summary.status)}
                      </span>
                    </div>
                    {summary.status === 'failed' ? (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-400/20">
                        <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300">
                          {summary.error_message || 'Summary generation failed for an unknown reason.'}
                        </p>
                      </div>
                    ) : summary.status === 'generating' ? (
                      <p className="text-sm text-indigo-200/60 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating summary directly from audio via Gemini...
                      </p>
                    ) : (
                      <>
                        <h4 className="text-base font-bold text-white mb-2">{summary.title || 'Meeting Summary'}</h4>
                        <p className="text-sm text-indigo-100/80 whitespace-pre-wrap leading-relaxed">
                          {summary.detailed_summary || summary.short_summary || 'No content.'}
                        </p>
                        {summary.key_points && summary.key_points.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs font-bold text-indigo-200/60 uppercase tracking-wide mb-2">
                              Key Takeaways
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {summary.key_points.map((point, index) => (
                                <li key={index} className="text-sm text-indigo-100/80">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {summary.action_items && summary.action_items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs font-bold text-indigo-200/60 uppercase tracking-wide mb-2">
                              Action Items
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {summary.action_items.map((item, index) => (
                                <li key={index} className="text-sm text-indigo-100/80">
                                  {typeof item === 'string' ? item : `${item.action || item.description || ''} ${item.assignee ? `(Assignee: ${item.assignee})` : ''}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
