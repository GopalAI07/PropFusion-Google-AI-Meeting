import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEETING_API } from '../api/axios';
import { X, Calendar, Clock, Users, Video, Loader2, Sparkles, Plus, FileText } from 'lucide-react';

export default function CreateMeetingModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    duration: 60,
    participant_emails: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Meeting title is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const emails = formData.participant_emails
        ? formData.participant_emails
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email.length > 0)
        : [];

      let scheduled_at;
      if (formData.scheduled_date) {
        const timeStr = formData.scheduled_time || '00:00';
        const dateObj = new Date(`${formData.scheduled_date}T${timeStr}`);
        if (!isNaN(dateObj.getTime())) {
          scheduled_at = dateObj.toISOString();
        }
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        scheduled_at,
        duration_minutes: Number(formData.duration) || 60,
        participant_emails: emails.length > 0 ? emails : undefined,
      };

      const res = await MEETING_API.create(payload);
      // Backend wraps the created meeting as { success, message, data: { meeting } }
      const createdMeeting = res.data?.data?.meeting || res.data?.meeting || res.data;

      if (onSuccess) {
        onSuccess(createdMeeting);
      }
      onClose();
      if (createdMeeting?.id) {
        navigate(`/meetings/${createdMeeting.id}`);
      } else {
        navigate('/meetings');
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Failed to create meeting. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity">
      {/* Background ambient glow effect */}
      <div className="absolute w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-modal-pop z-10 text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header styling */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl ring-1 ring-white/30 shadow-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Create New Meeting
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                Set up instant AI room or schedule for later
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition-all relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Solid Black Text without dark:text-white */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-white text-gray-900">
          {error && (
            <div className="p-3.5 text-sm font-semibold rounded-2xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-indigo-600" />
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Executive Strategy & AI Brainstorming"
              className="w-full px-4 py-3 text-sm font-semibold rounded-2xl border border-gray-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              required
            />
          </div>

          {/* Description & Agenda */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Description & Agenda
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Detail key goals, agenda topics, and reference links..."
              className="w-full px-4 py-3 text-sm font-semibold rounded-2xl border border-gray-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
            />
          </div>

          {/* Separated Date, Time, and Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Date
              </label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm font-semibold rounded-2xl border border-gray-300 bg-white text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {/* 2. Time */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Time
              </label>
              <input
                type="time"
                name="scheduled_time"
                value={formData.scheduled_time}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm font-semibold rounded-2xl border border-gray-300 bg-white text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {/* 3. Duration */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Duration
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm font-semibold rounded-2xl border border-gray-300 bg-white text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none cursor-pointer"
              >
                <option value={15} className="bg-white text-black">15 minutes</option>
                <option value={30} className="bg-white text-black">30 minutes</option>
                <option value={45} className="bg-white text-black">45 minutes</option>
                <option value={60} className="bg-white text-black">1 hour</option>
                <option value={90} className="bg-white text-black">1.5 hours</option>
                <option value={120} className="bg-white text-black">2 hours</option>
              </select>
            </div>
          </div>

          {/* Participant Emails */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Invite Participants (Comma Separated)
            </label>
            <input
              type="text"
              name="participant_emails"
              value={formData.participant_emails}
              onChange={handleChange}
              placeholder="alex@company.com, sarah@company.com"
              className="w-full px-4 py-3 text-sm font-semibold rounded-2xl border border-gray-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-extrabold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Meeting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
