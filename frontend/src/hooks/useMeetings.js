import { useState, useEffect, useCallback } from 'react';
import { MEETING_API } from '../api/axios';

export function useMeetings(initialParams = {}) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });

  const fetchMeetings = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: params.page || pagination.page,
        page_size: params.pageSize || pagination.pageSize,
        ...params,
      };
      const response = await MEETING_API.getAll(queryParams);
      const data = response.data;
      setMeetings(data.items);
      setPagination({
        total: data.total,
        page: data.page,
        pageSize: data.page_size,
        totalPages: data.total_pages,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchMeetings(initialParams);
  }, []);

  const createMeeting = async (data) => {
