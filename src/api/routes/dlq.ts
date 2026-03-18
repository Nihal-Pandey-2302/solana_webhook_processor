import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { webhookQueue, alertQueue } from '../../workers/queue';
import { getDeadLetterJobs, updateDeadLetterJobStatus, deleteDeadLetterJob } from '../../db/queries/dlqQueries';
import { DatabaseError, NotFoundError } from '../../types/errors';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as string;
    const jobs = await getDeadLetterJobs(status);
    res.json(jobs);
  } catch (err) {
    next(new DatabaseError('Failed to fetch DLQ jobs'));
  }
});

router.post('/:id/retry', async (req, res, next) => {
  try {
    const { id } = req.params;
    const jobRecord = await updateDeadLetterJobStatus(id, 'retried');
    
    if (!jobRecord) {
      return next(new NotFoundError('Job not found in DLQ'));
    }

    if (jobRecord.original_queue === 'webhook-queue') {
      await webhookQueue.add('process-webhook', jobRecord.job_data);
    } else if (jobRecord.original_queue === 'alert-queue') {
      await alertQueue.add('send-alert', jobRecord.job_data);
    }

    res.json({ message: 'Job requeued', jobRecord });
  } catch (err) {
    next(new DatabaseError('Failed to retry job'));
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const jobRecord = await updateDeadLetterJobStatus(id, 'discarded');
    if (!jobRecord) {
      return next(new NotFoundError('Job not found in DLQ'));
    }
    res.json({ message: 'Job discarded' });
  } catch (err) {
    next(new DatabaseError('Failed to discard job'));
  }
});

export default router;
