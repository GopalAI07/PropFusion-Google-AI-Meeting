import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MEETING_API } from '../api/axios';
import { formatDate, formatDuration, getStatusColor, formatStatusLabel } from '../utils/helpers';
import { Search, Loader2, Calendar, Clock, Filter, Video, Sparkles, LogIn } from 'lucide-react';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchMeetings = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: pagination.pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await MEETING_API.getAll(params);
      const data = response.data;
      setMeetings(data.items);
      setPagination({
        page: data.page,
        pageSize: data.page_size,
        total: data.total,
        totalPages: data.total_pages,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, statusFilter, searchTerm]);

  useEffect(() => {
    fetchMeetings(1);
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMeetings(1);
  };

  // Matches backend MeetingStatus enum: scheduled, in_progress, completed, cancelled, paused
  const statuses = ['all', 'scheduled', 'completed', 'cancelled', 'paused'];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">

      {/* ─── Full-page gradient background ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #0f0c29 0%, #1a1560 30%, #1e3a5f 60%, #0d2137 100%)',
        }}
      />

      {/* Ambient orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-32 right-16 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Content ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            Meeting Library
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Meetings</h1>
          <p className="mt-2 text-indigo-100/70 text-sm sm:text-base">
            Manage and view all your meetings
          </p>
        </div>

        {/* Filters */}
        <div
          className="rounded-3xl p-5 border border-white/10 shadow-xl"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)' }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search meetings..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-indigo-200/40 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50"
              />
            </form>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-200/60 hidden sm:block" />
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                      statusFilter === status
                        ? 'text-white shadow-lg'
                        : 'bg-white/5 text-indigo-200/70 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                    style={
                      statusFilter === status
                        ? { background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }
                        : undefined
                    }
                  >
                    {status === 'all' ? 'All' : formatStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meetings List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-300" />
          </div>
        ) : error ? (
          <div
            className="text-center py-16 rounded-3xl border border-red-400/20"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)' }}
          >
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => fetchMeetings(1)}
              className="px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105"
              style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
            >
              Retry
            </button>
          </div>
        ) : meetings.length === 0 ? (
          <div
            className="text-center py-20 rounded-3xl border border-white/10 shadow-xl"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)' }}
          >
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xl mb-4"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
            >
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <p className="text-white text-lg font-bold">No meetings found</p>
            <p className="text-indigo-200/60 mt-1 text-sm">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create a meeting from the dashboard to get started'}
            </p>
          </div>
        ) : (
          <div
            className="rounded-3xl border border-white/10 shadow-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)' }}
          >
            <div className="divide-y divide-white/10">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  to={`/meetings/${meeting.id}`}
                  className="group flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
                >
                  <div
                    className="hidden sm:flex w-11 h-11 rounded-2xl items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
                  >
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {meeting.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-indigo-200/60">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(meeting.created_at)}
                      </span>
                      {meeting.duration_minutes > 0 && (
                        <span className="flex items-center gap-1 text-xs text-indigo-200/60">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(meeting.duration_minutes)}
                        </span>
                      )}
                      {meeting.participant_count > 0 && (
                        <span className="text-xs text-indigo-200/60">
                          {meeting.participant_count} participant{meeting.participant_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`ml-2 shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(
                      meeting.status
                    )}`}
                  >
                    {formatStatusLabel(meeting.status)}
                  </span>
                  {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
                    <Link
                      to={`/meetings/${meeting.id}/room`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2 shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Join
                    </Link>
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-indigo-200/60">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchMeetings(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/15 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchMeetings(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/15 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
