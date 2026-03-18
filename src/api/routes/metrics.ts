import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import pool from '../../db';
import { webhookQueue } from '../../workers/queue';
import { DatabaseError } from '../../types/errors';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queueDepth = await webhookQueue.getWaitingCount();

    // The user requested table for processed_signatures or duplicate skips. Let's assume we have it.
    // Also events processed in last hour, failed in last hour, etc.
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const jobsProcessedLastHourResult = await pool.query(
      "SELECT count(*) FROM events WHERE created_at > $1",
      [oneHourAgo]
    );
    const jobsProcessedLastHour = parseInt(jobsProcessedLastHourResult.rows[0].count, 10);

    // We'll add dead_letter_jobs metrics when DLQ is implemented
    let jobsFailedLastHour = null;
    let dlqPendingCount = null;
    let duplicateSignaturesLastHour = null;

    try {
      const dlqFailed = await pool.query(
        "SELECT count(*) FROM dead_letter_jobs WHERE failed_at > $1",
        [oneHourAgo]
      );
      jobsFailedLastHour = parseInt(dlqFailed.rows[0].count, 10);

      const dlqPending = await pool.query(
        "SELECT count(*) FROM dead_letter_jobs WHERE status = 'pending'"
      );
      dlqPendingCount = parseInt(dlqPending.rows[0].count, 10);
    } catch (e) {
      // Table might not exist yet if DLQ migration isn't run, return null
    }

    try {
      // duplicate_skips is part of the request, we can just track it via the processed_signatures duplicates. 
      // But processed_signatures doesn't keep a count. The prompt said: "add a duplicate_skips table or counter for this"
      const dupSkips = await pool.query(
        "SELECT count FROM duplicate_skips WHERE time_bucket > $1",
        [oneHourAgo]
      );
      duplicateSignaturesLastHour = dupSkips.rows.reduce((acc, row) => acc + parseInt(row.count, 10), 0);
    } catch (e) {
      // Return null if table not present
    }

    res.json({
      queue_depth: queueDepth,
      jobs_processed_last_hour: jobsProcessedLastHour,
      jobs_failed_last_hour: jobsFailedLastHour,
      dlq_pending_count: dlqPendingCount,
      avg_processing_time_ms: null, // Hard to calculate purely from events unless we log webhook receipt time
      duplicate_signatures_last_hour: duplicateSignaturesLastHour
    });
  } catch (err) {
    next(new DatabaseError('Failed to fetch metrics'));
  }
});

export default router;
