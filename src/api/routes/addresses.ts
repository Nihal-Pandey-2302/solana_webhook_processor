import { DatabaseError, ValidationError } from '../../types/errors';
import { Router } from 'express';
import { logger } from '../../config';
import { createAddressSchema } from '../../types';
import { createAddress, deleteAddress, getAllAddresses } from '../../db/queries/addressQueries';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const parseResult = createAddressSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(new ValidationError('Invalid input'));
    }

    const { address } = parseResult.data;
    const newAddress = await createAddress(address);
    res.status(201).json(newAddress);
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

router.get('/', async (req, res, next) => {
  try {
    const addresses = await getAllAddresses();
    res.json(addresses);
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await deleteAddress(id);
    if (!success) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

export default router;
