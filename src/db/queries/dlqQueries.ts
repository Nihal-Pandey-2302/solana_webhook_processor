import { query } from '../index';

export const insertDeadLetterJob = async (
  original_queue: string,
  job_id: string,
  job_data: any,
  failure_reason: string,
  retry_count: number
) => {
  await query(
    `INSERT INTO dead_letter_jobs (original_queue, job_id, job_data, failure_reason, retry_count) 
     VALUES ($1, $2, $3, $4, $5)`,
    [original_queue, job_id, job_data, failure_reason, retry_count]
  );
};

export const getDeadLetterJobs = async (status?: string) => {
  if (status) {
    const res = await query('SELECT * FROM dead_letter_jobs WHERE status = $1 ORDER BY failed_at DESC', [status]);
    return res.rows;
  }
  const res = await query('SELECT * FROM dead_letter_jobs ORDER BY failed_at DESC');
  return res.rows;
};

export const updateDeadLetterJobStatus = async (id: string, status: string) => {
  const res = await query('UPDATE dead_letter_jobs SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
  return res.rows[0];
};

export const deleteDeadLetterJob = async (id: string) => {
  const res = await query('DELETE FROM dead_letter_jobs WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
};
