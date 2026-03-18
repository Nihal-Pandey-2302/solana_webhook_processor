import { Router } from 'express';
import { logger } from '../../config';
import { createRuleSchema } from '../../types';
import { createRule, deleteRule, getRulesForAddressId } from '../../db/queries/ruleQueries';

const router = Router({ mergeParams: true }); // to access /addresses/:id/rules

router.get('/', async (req, res) => {
  try {
    const { id: address_id } = req.params;
    const rules = await getRulesForAddressId(address_id);
    res.json(rules);
  } catch (err) {
    logger.error({ err }, 'Error fetching rules');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id: address_id } = req.params;
    const parseResult = createRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
    }

    const { condition_type, condition_value, channels } = parseResult.data;
    const newRule = await createRule(address_id, condition_type, condition_value ?? null, channels);
    res.status(201).json(newRule);
  } catch (err) {
    logger.error({ err }, 'Error creating rule');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:ruleId', async (req, res) => {
  try {
    const { id: address_id, ruleId } = req.params;
    const success = await deleteRule(ruleId, address_id);
    if (!success) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Error deleting rule');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
