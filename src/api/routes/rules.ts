import { DatabaseError, ValidationError } from '../../types/errors';
import { Router } from 'express';
import { logger } from '../../config';
import { createRuleSchema } from '../../types';
import { createRule, deleteRule, getRulesForAddressId } from '../../db/queries/ruleQueries';

const router = Router({ mergeParams: true }); // to access /addresses/:id/rules

router.get('/', async (req, res, next) => {
  try {
    const { id: address_id } = req.params as { id: string };
    const rules = await getRulesForAddressId(address_id);
    res.json(rules);
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { id: address_id } = req.params as { id: string };
    const parseResult = createRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(new ValidationError('Invalid input'));
    }

    const { condition_type, condition_value, channels } = parseResult.data;
    const newRule = await createRule(address_id, condition_type, condition_value ?? null, channels);
    res.status(201).json(newRule);
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

router.delete('/:ruleId', async (req, res, next) => {
  try {
    const { id: address_id, ruleId } = req.params as { id: string, ruleId: string };
    const success = await deleteRule(ruleId, address_id);
    if (!success) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

export default router;
